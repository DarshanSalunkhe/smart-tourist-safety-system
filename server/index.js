require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const { pool, initializeDatabase, testConnection } = require('./db');
const inactiveMonitor = require('./services/inactiveMonitor');

const BCRYPT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'safetrip-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// ── Validation helper ──────────────────────────────────────
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

// ── JWT helpers ────────────────────────────────────────────
function signTokens(userId, role) {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, role, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

// ── JWT middleware — accepts both JWT and legacy session ───
function requireAuth(req, res, next) {
  console.log('[Auth] Request to:', req.path);
  console.log('[Auth] Session ID:', req.sessionID);
  console.log('[Auth] Session userId:', req.session?.userId);
  console.log('[Auth] Cookies:', Object.keys(req.cookies || {}));
  
  // 1. Try Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      req.userId = payload.userId;
      req.userRole = payload.role;
      console.log('[Auth] ✅ Authenticated via JWT:', req.userId, req.userRole);
      return next();
    } catch (e) {
      console.error('[Auth] ❌ Invalid JWT token:', e.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
  // 2. Fall back to session (backward compat)
  if (req.session?.userId) {
    req.userId = req.session.userId;
    console.log('[Auth] ✅ Authenticated via session:', req.userId);
    return next();
  }
  console.error('[Auth] ❌ No valid authentication found');
  return res.status(401).json({ error: 'Authentication required' });
}

const app = express();
const server = http.createServer(app);
// ============= ALLOWED ORIGINS =============

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());

// Frontend URL for OAuth redirects
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ============= GOOGLE OAUTH CREDENTIALS =============
// Load from environment variables (production-ready)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Validate OAuth credentials on startup
if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('❌ Google OAuth credentials missing in environment variables');
  console.error('   Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
  console.error('   Set these in your .env file or deployment platform');
  process.exit(1);
}

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// ============= MIDDLEWARE =============

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting — relaxed in development so you don't block yourself
const isDev = process.env.NODE_ENV !== 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 20,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' }
});

const sosLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 5,
  message: { error: 'SOS rate limit reached.' }
});

app.use(generalLimiter);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', origin);
      console.warn('[CORS] Allowed origins:', ALLOWED_ORIGINS);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'safetrip-secret-key-change-in-production',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined
  },
  rolling: true,
  proxy: process.env.NODE_ENV === 'production'
}));

// ============= HEALTH CHECK =============

// Root route for Render health checks (HEAD and GET)
app.get('/', (req, res) => {
  res.json({
    service: 'SafeTrip API',
    status: 'running',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()) + 's'
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    db: 'connected',
    websocket: 'ready',
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// ============= STATIC FILES =============

// Serve public folder for test pages and static assets
app.use(express.static(path.join(__dirname, '../public')));

// Serve dist folder for production build
app.use(express.static(path.join(__dirname, '../dist')));

// Serve uploads folder for profile photos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Profile routes
const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

// ============= HELPER FUNCTIONS =============

function generateBlockchainId() {
  return 'BLK-' + Math.random().toString(36).substring(2, 11).toUpperCase();
}

function generateId(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============= DATABASE SEED =============

async function seedDemoUsers() {
  try {
    // First, fix any NULL roles (set default to 'tourist')
    await pool.query(`UPDATE users SET role = 'tourist' WHERE role IS NULL`);
    console.log('✅ Fixed NULL roles');
    
    // Fix auth_provider for users without it
    await pool.query(`UPDATE users SET auth_provider = 'google' WHERE google_id IS NOT NULL AND (auth_provider IS NULL OR auth_provider = 'unknown')`);
    await pool.query(`UPDATE users SET auth_provider = 'email' WHERE google_id IS NULL AND (auth_provider IS NULL OR auth_provider = 'unknown')`);
    console.log('✅ Fixed auth_provider values');
    
    const demoUsers = [
      {
        id: 'demo-tourist-1',
        email: 'tourist@demo.com',
        password: 'demo123',
        name: 'Demo Tourist',
        role: 'tourist',
        phone: '+91-9876543210',
        emergency_contact: '+91-9999999999',
        blockchain_id: 'BLK-TOURIST001',
        verified: true
      },
      {
        id: 'demo-authority-1',
        email: 'authority@demo.com',
        password: 'demo123',
        name: 'Demo Authority',
        role: 'authority',
        phone: '+91-9876543211',
        emergency_contact: '+91-9999999998',
        blockchain_id: 'BLK-AUTH001',
        verified: true
      },
      {
        id: 'demo-admin-1',
        email: 'admin@demo.com',
        password: 'demo123',
        name: 'Demo Admin',
        role: 'admin',
        phone: '+91-9876543212',
        emergency_contact: '+91-9999999997',
        blockchain_id: 'BLK-ADMIN001',
        verified: true
      }
    ];

    for (const user of demoUsers) {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO users (id, email, password, name, role, phone, emergency_contact, blockchain_id, verified, auth_provider)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [user.id, user.email, user.password, user.name, user.role, user.phone, user.emergency_contact, user.blockchain_id, user.verified, 'email']
        );
      }
    }
    console.log('✅ Demo users seeded');
  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
  }
}

// ============= GOOGLE OAUTH ROUTES =============

app.get('/auth/google', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
  
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  console.log('[OAuth] Callback hit');
  
  const { code } = req.query;
  
  if (!code) {
    console.error('[OAuth] No code received');
    return res.redirect(`${FRONTEND_URL}/#/login?error=no_code`);
  }
  
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;
    
    console.log('[OAuth] User authenticated:', email);
    
    // Check if user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR google_id = $2',
      [email, googleId]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('[OAuth] Existing user found:', user.email, 'Role:', user.role);
      
      // Update Google info
      await pool.query(
        'UPDATE users SET google_id = $1, picture = $2, auth_provider = $3 WHERE id = $4',
        [googleId, picture, 'google', user.id]
      );
      
      // Generate JWT tokens for cross-domain auth
      const { accessToken, refreshToken } = signTokens(user.id, user.role);
      
      // Also set session for backward compatibility
      req.session.userId = user.id;
      req.session.user = user;
      
      const dashboardRoute = user.role === 'tourist' ? 'tourist' : 
                            user.role === 'authority' ? 'authority' : 'admin';
      
      console.log('[OAuth] Redirecting to:', dashboardRoute, 'with tokens');
      
      // Redirect with tokens in URL (will be extracted by frontend and stored)
      res.redirect(`${FRONTEND_URL}/#/${dashboardRoute}?token=${accessToken}&refresh=${refreshToken}`);
    } else {
      console.log('[OAuth] New user, storing pending data');
      req.session.pendingGoogleUser = {
        googleId: googleId,
        email: email,
        name: name,
        picture: picture
      };
      
      req.session.save((err) => {
        if (err) {
          console.error('[OAuth] Session save error:', err);
          return res.redirect(`${FRONTEND_URL}/#/login?error=session_failed`);
        }
        
        console.log('[OAuth] Pending user saved, redirecting to role selection');
        res.redirect(`${FRONTEND_URL}/#/select-role`);
      });
    }
    
  } catch (error) {
    console.error('[OAuth] Authentication error:', error);
    res.redirect(`${FRONTEND_URL}/#/login?error=auth_failed`);
  }
});

app.post('/auth/google/complete', async (req, res) => {
  console.log('[OAuth] Completing registration with role');
  console.log('[OAuth] Session ID:', req.sessionID);
  
  const { role, phone, emergencyContact } = req.body;
  const pendingUser = req.session.pendingGoogleUser;
  
  if (!pendingUser) {
    console.error('[OAuth] No pending user in session');
    return res.status(400).json({ error: 'No pending Google user found. Please sign in again.' });
  }
  
  if (!role || !['tourist', 'authority', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (tourist, authority, or admin)' });
  }
  
  try {
    const newUser = {
      id: `google-${Date.now()}`,
      googleId: pendingUser.googleId,
      email: pendingUser.email,
      name: pendingUser.name,
      picture: pendingUser.picture,
      role: role,
      phone: phone || '',
      emergencyContact: emergencyContact || '',
      blockchainId: generateBlockchainId(),
      verified: true,
      authProvider: 'google'
    };
    
    await pool.query(
      `INSERT INTO users (id, google_id, email, name, picture, role, phone, emergency_contact, blockchain_id, verified, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [newUser.id, newUser.googleId, newUser.email, newUser.name, newUser.picture, newUser.role, 
       newUser.phone, newUser.emergencyContact, newUser.blockchainId, newUser.verified, newUser.authProvider]
    );
    
    console.log('[OAuth] User created:', newUser.email, 'Role:', role, 'ID:', newUser.id);
    
    req.session.userId = newUser.id;
    req.session.user = newUser;
    delete req.session.pendingGoogleUser;
    
    req.session.save((err) => {
      if (err) {
        console.error('[OAuth] Session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      console.log('[OAuth] Registration complete, session saved with userId:', req.session.userId);
      res.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          picture: newUser.picture,
          blockchainId: newUser.blockchainId,
          phone: newUser.phone,
          emergencyContact: newUser.emergencyContact
        }
      });
    });
  } catch (error) {
    console.error('[OAuth] Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ============= TRADITIONAL AUTH ROUTES =============

app.post('/auth/login',
  authLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];

      // Support both bcrypt hashes and legacy plaintext (demo accounts)
      let passwordMatch = false;
      if (user.password && user.password.startsWith('$2b$')) {
        passwordMatch = await bcrypt.compare(password, user.password);
      } else {
        passwordMatch = user.password === password; // legacy demo accounts
      }

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      req.session.user = user;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Failed to save session' });
        const { accessToken, refreshToken } = signTokens(user.id, user.role);
        res.json({
          success: true,
          accessToken,
          refreshToken,
          user: {
            id: user.id, email: user.email, name: user.name, role: user.role,
            picture: user.picture, profile_photo: user.profile_photo,
            blockchainId: user.blockchain_id,
            phone: user.phone, emergencyContact: user.emergency_contact
          }
        });
      });
    } catch (error) {
      console.error('[Auth] Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

app.post('/auth/register',
  authLimiter,
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name required (max 100 chars)'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['tourist', 'authority', 'admin']).withMessage('Invalid role'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  validate,
  async (req, res) => {
    const { name, email, password, role, phone, emergencyContact } = req.body;
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const newUser = {
        id: generateId('user-'),
        email, name, role,
        password: hashedPassword,
        phone: phone || '',
        emergencyContact: emergencyContact || '',
        blockchainId: generateBlockchainId(),
        verified: true
      };

      await pool.query(
        `INSERT INTO users (id, email, password, name, role, phone, emergency_contact, blockchain_id, verified, auth_provider)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newUser.id, newUser.email, newUser.password, newUser.name, newUser.role,
         newUser.phone, newUser.emergencyContact, newUser.blockchainId, newUser.verified, 'email']
      );

      req.session.userId = newUser.id;
      req.session.user = newUser;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Failed to save session' });
        const { accessToken, refreshToken } = signTokens(newUser.id, newUser.role);
        res.json({
          success: true,
          accessToken,
          refreshToken,
          user: {
            id: newUser.id, email: newUser.email, name: newUser.name,
            role: newUser.role, blockchainId: newUser.blockchainId,
            phone: newUser.phone, emergencyContact: newUser.emergencyContact
          }
        });
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

app.get('/auth/user', async (req, res) => {
  console.log('[Auth] Get user request');
  console.log('[Auth] Session ID:', req.sessionID);
  console.log('[Auth] User ID:', req.session?.userId);
  
  if (req.session && req.session.pendingGoogleUser) {
    console.log('[Auth] Returning pending Google user');
    return res.json({
      pendingGoogleUser: req.session.pendingGoogleUser
    });
  }
  
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        picture: user.picture,
        profile_photo: user.profile_photo,
        blockchainId: user.blockchain_id,
        phone: user.phone,
        emergencyContact: user.emergency_contact
      }
    });
  } catch (error) {
    console.error('[Auth] Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/auth/pending-google-user', (req, res) => {
  console.log('[Auth] Checking for pending Google user');
  console.log('[Auth] Session ID:', req.sessionID);
  
  if (req.session && req.session.pendingGoogleUser) {
    console.log('[Auth] Pending user found:', req.session.pendingGoogleUser.email);
    res.json({
      pending: true,
      user: req.session.pendingGoogleUser
    });
  } else {
    console.log('[Auth] No pending user found');
    res.json({ pending: false });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ── Token refresh ──────────────────────────────────────────
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });
    const { accessToken, refreshToken: newRefresh } = signTokens(payload.userId, payload.role);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ============= INCIDENT ROUTES =============

app.post('/api/incidents',
  sosLimiter,
  body('userId').notEmpty().withMessage('userId required'),
  body('type').isIn(['theft','harassment','medical','lost','sos','other']).withMessage('Invalid incident type'),
  body('severity').isIn(['low','medium','high','critical']).withMessage('Invalid severity'),
  body('description').optional().isLength({ max: 1000 }).trim(),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }),
  validate,
  async (req, res) => {
    const { userId, type, description, severity, location, method } = req.body;
    try {
      const incident = {
        id: generateId('incident-'),
        userId, type,
        description: description || '',
        severity, status: 'new',
        method: method || 'manual',
        locationLat: location?.lat || null,
        locationLng: location?.lng || null,
        state: location?.state || null,
        city: location?.city || null,
      };
      await pool.query(
        `INSERT INTO incidents (id, user_id, type, description, severity, status, method, location_lat, location_lng, state, city)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [incident.id, incident.userId, incident.type, incident.description, incident.severity,
         incident.status, incident.method, incident.locationLat, incident.locationLng,
         incident.state, incident.city]
      );
      io.emit('newIncident', incident);

      // Trigger SMS SOS alert for critical/SOS incidents
      if (incident.type === 'sos' || incident.severity === 'critical') {
        try {
          const { sendSOSAlert } = require('./services/smsService');
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [incident.userId]);
          if (userResult.rows.length > 0) {
            sendSOSAlert(userResult.rows[0], { lat: incident.locationLat, lng: incident.locationLng }, incident.id)
              .catch(e => console.error('[SMS] SOS alert failed:', e.message));
          }
        } catch (e) {
          console.error('[SMS] Service error:', e.message);
        }
      }

      res.json({ success: true, incident });
    } catch (error) {
      console.error('[Incidents] Error creating incident:', error);
      res.status(500).json({ error: 'Failed to create incident' });
    }
  }
);

app.get('/api/incidents', async (req, res) => {
  console.log('[Incidents] Get incidents request');
  console.log('[Incidents] Query params:', req.query);
  
  const { userId, status, state, city } = req.query;
  
  try {
    let query = `
      SELECT 
        i.id, i.user_id, i.type, i.description, i.severity, i.status, i.method,
        i.location_lat, i.location_lng, i.state, i.city, i.responses, i.demo,
        i.created_at, i.updated_at,
        u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
      FROM incidents i 
      LEFT JOIN users u ON i.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
      query += ` AND i.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (state && state !== 'all') {
      query += ` AND i.state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }
    
    if (city && city !== 'all') {
      query += ` AND i.city = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    console.log('[Incidents] Final SQL query:', query);
    console.log('[Incidents] Query parameters:', params);
    
    const result = await pool.query(query, params);
    
    console.log('[Incidents] Incidents fetched:', result.rows.length);
    console.log('[Incidents] Incident details:', result.rows.map(i => ({ 
      id: i.id, 
      type: i.type, 
      severity: i.severity, 
      status: i.status,
      user_id: i.user_id,
      user_name: i.user_name,
      user_role: i.user_role
    })));
    
    const incidentsWithSuggestions = result.rows.map(incident => ({
      ...incident,
      dispatchSuggestions: recommendDispatch(incident)
    }));

    res.json({ incidents: incidentsWithSuggestions });
  } catch (error) {
    console.error('[Incidents] Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

// ============= INCIDENT PATCH ROUTE =============

app.patch('/api/incidents/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  const validStatuses = ['new', 'in-progress', 'resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE incidents
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const updated = result.rows[0];

    // Broadcast status change via Socket.IO
    io.emit('incident:status:broadcast', {
      incidentId: id,
      status,
      notes: notes || null,
      updatedAt: updated.updated_at
    });

    console.log(`[Incidents] Status updated: ${id} → ${status}`);
    res.json({ success: true, incident: updated });
  } catch (error) {
    console.error('[Incidents] Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// ============= USER ROUTES =============

app.get('/api/users', requireAuth, async (req, res) => {
  console.log('[Users API] Request from user:', req.userId, 'Session role:', req.userRole);
  
  // Only admin and authority can list users
  const callerRole = req.userRole || (await pool.query('SELECT role FROM users WHERE id=$1',[req.userId])).rows[0]?.role;
  console.log('[Users API] Resolved caller role:', callerRole);
  
  if (!['admin','authority'].includes(callerRole)) {
    console.warn('[Users API] ❌ Access denied for role:', callerRole);
    return res.status(403).json({ error: 'Forbidden — admin or authority only' });
  }

  const { role, state, city } = req.query;
  console.log('[Users API] Query filters:', { role, state, city });
  
  try {
    // Use CASE statement to auto-detect inactive users (no update for 10+ minutes)
    let query = `
      SELECT 
        id, email, name, role, phone, emergency_contact, blockchain_id, picture, profile_photo,
        state, city, auth_provider, google_id, location_lat, location_lng, 
        location_timestamp, created_at,
        CASE 
          WHEN location_active = true 
            AND location_timestamp IS NOT NULL 
            AND (NOW() - location_timestamp) < INTERVAL '10 minutes' 
          THEN true
          ELSE false
        END as location_active
      FROM users 
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    if (state && state !== 'all') {
      query += ` AND state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }
    
    if (city && city !== 'all') {
      query += ` AND city = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    console.log('[Users] Query:', query);
    console.log('[Users] Params:', params);
    
    const result = await pool.query(query, params);
    
    console.log('[Users] Users fetched:', result.rows.length);
    console.log('[Users] User details:', result.rows.map(u => ({ id: u.id, email: u.email, role: u.role })));
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('[Users] Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/api/users/:id', requireAuth, async (req, res) => {
  console.log('[Users] Delete user:', req.params.id);
  
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[Users] Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { phone, emergencyContact } = req.body;

  if (!phone && !emergencyContact) {
    return res.status(400).json({ error: 'phone or emergencyContact is required' });
  }

  // Support both JWT (req.userId) and session auth (req.session.userId)
  const authenticatedId = req.userId || req.session?.userId;
  if (!authenticatedId || authenticatedId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET phone = COALESCE($1, phone),
           emergency_contact = COALESCE($2, emergency_contact)
       WHERE id = $3
       RETURNING id, email, name, role, phone, emergency_contact, blockchain_id, picture, profile_photo`,
      [phone || null, emergencyContact || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = result.rows[0];

    // Sync session and localStorage-side user object
    req.session.user = { ...req.session.user, ...updated };

    console.log('[Users] Profile updated for:', id);
    res.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        phone: updated.phone,
        emergencyContact: updated.emergency_contact,
        blockchainId: updated.blockchain_id,
        picture: updated.picture,
        profile_photo: updated.profile_photo
      }
    });
  } catch (error) {
    console.error('[Users] Error updating user:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============= ANALYTICS ROUTES =============

app.get('/api/analytics/overview', async (req, res) => {
  console.log('[Analytics] Get overview');
  
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_incidents,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN type = 'sos' THEN 1 END) as sos_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_count
      FROM incidents
    `);
    
    const userResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'tourist' THEN 1 END) as tourists,
        COUNT(CASE WHEN role = 'authority' THEN 1 END) as authorities,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
      FROM users
    `);
    
    res.json({
      incidents: result.rows[0],
      users: userResult.rows[0]
    });
  } catch (error) {
    console.error('[Analytics] Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

app.get('/api/analytics/state-wise', async (req, res) => {
  console.log('[Analytics] Get state-wise data');
  
  try {
    const result = await pool.query(`
      SELECT 
        state,
        COUNT(*) as incident_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
      FROM incidents
      WHERE state IS NOT NULL
      GROUP BY state
      ORDER BY incident_count DESC
    `);
    
    res.json({ stateData: result.rows });
  } catch (error) {
    console.error('[Analytics] Error fetching state-wise data:', error);
    res.status(500).json({ error: 'Failed to fetch state-wise analytics' });
  }
});

app.get('/api/analytics/severity', async (req, res) => {
  console.log('[Analytics] Get severity distribution');
  
  try {
    const result = await pool.query(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM incidents
      GROUP BY severity
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `);
    
    res.json({ severityData: result.rows });
  } catch (error) {
    console.error('[Analytics] Error fetching severity data:', error);
    res.status(500).json({ error: 'Failed to fetch severity analytics' });
  }
});

app.get('/api/analytics/monthly', async (req, res) => {
  console.log('[Analytics] Get monthly trend');
  
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as incident_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
      FROM incidents
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `);
    
    res.json({ monthlyData: result.rows });
  } catch (error) {
    console.error('[Analytics] Error fetching monthly data:', error);
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
});

app.get('/api/analytics/top-cities', async (req, res) => {
  console.log('[Analytics] Get top risk cities');
  
  try {
    const result = await pool.query(`
      SELECT 
        city,
        state,
        COUNT(*) as incident_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
      FROM incidents
      WHERE city IS NOT NULL
      GROUP BY city, state
      ORDER BY incident_count DESC
      LIMIT 5
    `);
    
    res.json({ topCities: result.rows });
  } catch (error) {
    console.error('[Analytics] Error fetching top cities:', error);
    res.status(500).json({ error: 'Failed to fetch top cities' });
  }
});

// ============= RISK ZONE ROUTES =============

app.get('/api/risk-zones', async (req, res) => {
  console.log('[RiskZones] Get risk zones');
  
  const { state, city } = req.query;
  
  try {
    let query = 'SELECT * FROM risk_zones WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (state && state !== 'all') {
      query += ` AND state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }
    
    if (city && city !== 'all') {
      query += ` AND city = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({ riskZones: result.rows });
  } catch (error) {
    console.error('[RiskZones] Error fetching risk zones:', error);
    res.status(500).json({ error: 'Failed to fetch risk zones' });
  }
});

app.post('/api/risk-zones', async (req, res) => {
  console.log('[RiskZones] Create risk zone');
  
  const { name, latitude, longitude, radius, riskLevel, state, city } = req.body;
  
  if (!name || !latitude || !longitude || !radius || !riskLevel) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO risk_zones (name, latitude, longitude, radius, risk_level, state, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, latitude, longitude, radius, riskLevel, state, city]
    );
    
    res.json({ success: true, riskZone: result.rows[0] });
  } catch (error) {
    console.error('[RiskZones] Error creating risk zone:', error);
    res.status(500).json({ error: 'Failed to create risk zone' });
  }
});

app.delete('/api/risk-zones/:id', async (req, res) => {
  console.log('[RiskZones] Delete risk zone:', req.params.id);
  
  try {
    await pool.query('DELETE FROM risk_zones WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[RiskZones] Error deleting risk zone:', error);
    res.status(500).json({ error: 'Failed to delete risk zone' });
  }
});

// ============= VOICE LOG ROUTES =============

const voiceLogsRouter = require('./routes/voiceLogs');
app.use('/api/voice-log', voiceLogsRouter);

// ============= SMS LOGS ROUTE (admin only) =============

app.get('/api/sms-logs', requireAuth, async (req, res) => {
  const callerRole = req.userRole || (await pool.query('SELECT role FROM users WHERE id=$1',[req.userId])).rows[0]?.role;
  if (callerRole !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { limit = 50, status } = req.query;
    let query = `SELECT sl.*, u.name as user_name FROM sms_logs sl LEFT JOIN users u ON sl.user_id = u.id WHERE 1=1`;
    const params = [];
    if (status) { query += ` AND sl.status = $${params.length+1}`; params.push(status); }
    query += ` ORDER BY sl.created_at DESC LIMIT $${params.length+1}`;
    params.push(Math.min(parseInt(limit) || 50, 200));
    const result = await pool.query(query, params);
    res.json({ smsLogs: result.rows, total: result.rows.length });
  } catch (e) {
    console.error('[SMS Logs] Error:', e);
    res.status(500).json({ error: 'Failed to fetch SMS logs' });
  }
});

// ============= CHATBOT ROUTES =============

const chatbotRouter = require('./routes/chatbot');
app.use('/api/chatbot', chatbotRouter);

const { recommendDispatch } = require('./services/dispatchRecommendationService');

// ============= CONSENT / DATA PRIVACY ROUTES =============

app.post('/api/consent',
  body('userId').notEmpty().withMessage('userId required'),
  body('consentType').isIn(['location_tracking', 'data_sharing', 'analytics', 'notifications']).withMessage('Invalid consent type'),
  body('granted').isBoolean().withMessage('granted must be boolean'),
  validate,
  async (req, res) => {
    const { userId, consentType, granted } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    try {
      await pool.query(
        `INSERT INTO consent_logs (user_id, consent_type, granted, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [userId, consentType, granted, ip]
      );
      res.json({ success: true, message: 'Consent recorded' });
    } catch (err) {
      console.error('[Consent] Error:', err.message);
      res.status(500).json({ error: 'Failed to record consent' });
    }
  }
);

app.get('/api/consent/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT consent_type, granted, created_at FROM consent_logs
       WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.params.userId]
    );
    res.json({ consents: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch consent logs' });
  }
});

// Data deletion request (right to erasure — GDPR Art. 17 / Indian DPDP Act)
app.delete('/api/user-data/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!req.session?.userId || req.session.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Anonymise rather than hard-delete to preserve incident records
    await pool.query(
      `UPDATE users SET
         email = 'deleted_' || id || '@safetrip.deleted',
         name = 'Deleted User',
         phone = NULL,
         emergency_contact = NULL,
         picture = NULL,
         google_id = NULL
       WHERE id = $1`,
      [userId]
    );
    req.session.destroy(() => {});
    res.json({ success: true, message: 'Personal data anonymised per data protection request' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process data deletion' });
  }
});

// ============= SOCKET.IO ================

io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);
  
  // Listen for location updates from tourists
  socket.on('tourist:location:update', async (data, ack) => {
    console.log('[Socket.IO] Received tourist:location:update:', data.userId, data.location);
    
    try {
      // Validate payload
      if (!data.userId || !data.location || !data.location.lat || !data.location.lng) {
        console.error('[Socket.IO] Invalid location data:', data);
        if (typeof ack === 'function') ack({ success: false, error: 'Invalid payload' });
        return;
      }
      
      // Update database with location and set active status
      await pool.query(
        `UPDATE users 
         SET location_lat = $1, 
             location_lng = $2, 
             location_timestamp = NOW(), 
             location_active = true,
             last_location_update = NOW(),
             last_known_lat = $1,
             last_known_lng = $2,
             location_inactive_alert_sent = false
         WHERE id = $3`,
        [data.location.lat, data.location.lng, data.userId]
      );
      
      console.log('[Socket.IO] DB updated - location_active=true for user:', data.userId);
      
      // Resolve any inactive alerts for this user
      inactiveMonitor.resolveAlert(data.userId);
      
      // Fetch updated user data
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [data.userId]);
      const updatedUser = result.rows[0];
      
      // Broadcast to ALL clients (authorities and admins)
      io.emit('tourist:location:broadcast', {
        userId: data.userId,
        location: data.location,
        user: updatedUser,
        active: true,
        timestamp: new Date().toISOString()
      });
      
      console.log('[Socket.IO] Broadcasted tourist:location:broadcast to ALL clients');
      
      // ACK back to the tourist with confirmed active state
      if (typeof ack === 'function') {
        ack({ success: true, userId: data.userId, active: true });
      }
      
    } catch (error) {
      console.error('[Socket.IO] Error updating location:', error);
      if (typeof ack === 'function') {
        ack({ success: false, error: error.message });
      }
    }
  });
  
  // Listen for location tracking stop
  socket.on('tourist:location:stop', async (data) => {
    console.log('[Socket.IO] Received tourist:location:stop:', data.userId);
    
    try {
      // Validate payload
      if (!data.userId) {
        console.error('[Socket.IO] Invalid stop tracking data:', data);
        return;
      }
      
      // Update database to set location_active = false
      await pool.query(
        `UPDATE users 
         SET location_active = false 
         WHERE id = $1`,
        [data.userId]
      );
      
      console.log('[Socket.IO] Database updated - location_active = false for user:', data.userId);
      
      // Broadcast to ALL clients
      io.emit('tourist:location:stopped', {
        userId: data.userId,
        active: false,
        timestamp: new Date().toISOString()
      });
      
      console.log('[Socket.IO] Broadcasted tourist:location:stopped to ALL clients');
    } catch (error) {
      console.error('[Socket.IO] Error stopping location tracking:', error);
    }
  });
  
  // Listen for SOS alerts
  socket.on('incident:sos:trigger', async (data) => {
    console.log('[Socket.IO] Received incident:sos:trigger:', data.userId);
    
    // Broadcast to ALL clients including sender
    io.emit('incident:sos:broadcast', data);
    
    console.log('[Socket.IO] Broadcasting incident:sos:broadcast to all clients');
  });
  
  // Listen for incident updates
  socket.on('incident:status:update', async (data) => {
    console.log('[Socket.IO] Received incident:status:update:', data.incidentId);
    
    // Broadcast to all clients
    io.emit('incident:status:broadcast', data);
    
    console.log('[Socket.IO] Broadcasting incident:status:broadcast to all clients');
  });
  
  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);
  });
});

// ============= SERVER START =============

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('🚀 Starting SafeTrip server...');
    
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }
    
    await initializeDatabase();
    await seedDemoUsers();
    
    // Make io globally available for inactive monitor
    global.io = io;
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log('📡 WebSocket server ready');
      console.log('🔐 Google OAuth configured');
      console.log(`   Client ID: ${CLIENT_ID.substring(0, 20)}...`);
      console.log(`   Redirect URI: ${REDIRECT_URI}`);
      console.log(`   Frontend URL: ${FRONTEND_URL}`);
      console.log('🗄️  PostgreSQL connected');
      
      // Start inactive tourist monitoring
      inactiveMonitor.start();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  inactiveMonitor.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  inactiveMonitor.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
