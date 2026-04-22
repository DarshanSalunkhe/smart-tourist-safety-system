# Admin Dashboard "No Data Available" Issue

## Problem
The Administrator view shows "No data available" in the Users Management table, even though users exist in the system.

## Possible Causes

### 1. **Empty Database** (Most Likely)
The database might not have any users yet.

**Check:**
```sql
SELECT COUNT(*) FROM users;
SELECT * FROM users LIMIT 5;
```

**Solution:** Add demo users or register new users through the registration page.

### 2. **Authentication Issue**
The `/api/users` endpoint requires authentication and only allows admin/authority roles.

**Check Browser Console:**
```
[AdminDashboard] Failed to fetch users: 401
[AdminDashboard] Failed to fetch users: 403
```

**Solution:** 
- Ensure you're logged in as an admin user
- Check if session/JWT is valid
- Verify `credentials: 'include'` is working

### 3. **API Connection Issue**
The frontend can't reach the backend API.

**Check Browser Console:**
```
[AdminDashboard] Error fetching users: Failed to fetch
[AdminDashboard] Error fetching users: NetworkError
```

**Solution:**
- Verify backend server is running
- Check `VITE_API_URL` environment variable
- Verify CORS settings

### 4. **Role Permission Issue**
The logged-in user doesn't have admin/authority role.

**Backend Check:**
```javascript
// server/index.js line ~809
app.get('/api/users', requireAuth, async (req, res) => {
  const callerRole = req.userRole || ...;
  if (!['admin','authority'].includes(callerRole)) {
    return res.status(403).json({ error: 'Forbidden — admin or authority only' });
  }
  // ...
});
```

**Solution:** Ensure the logged-in user has `role: 'admin'` in the database.

---

## Debugging Steps

### Step 1: Check Browser Console
Open Developer Tools (F12) and look for:

```
[AdminDashboard] Fetching users from: http://localhost:5000/api/users
[AdminDashboard] Fetch response status: 200
[AdminDashboard] ✅ Users fetched from API: 0
[AdminDashboard] ⚠️ No users returned from API
```

or

```
[AdminDashboard] ❌ Failed to fetch users: 401 Unauthorized
```

### Step 2: Check Network Tab
1. Open Developer Tools → Network tab
2. Refresh the Admin Dashboard
3. Look for the `/api/users` request
4. Check:
   - Status code (should be 200)
   - Response body (should contain `{ users: [...] }`)
   - Request headers (should include cookies/auth)

### Step 3: Check Backend Logs
Look for:
```
[Users] Query: SELECT ... FROM users WHERE 1=1
[Users] Params: []
[Users] Users fetched: 0
```

### Step 4: Check Database
```sql
-- Check if users table exists
SELECT * FROM information_schema.tables WHERE table_name = 'users';

-- Check user count
SELECT COUNT(*) FROM users;

-- Check users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Check specific admin user
SELECT id, name, email, role FROM users WHERE role = 'admin';
```

---

## Solutions

### Solution 1: Add Demo Users
If database is empty, add demo users:

```sql
-- Add admin user
INSERT INTO users (name, email, password, role, blockchain_id)
VALUES (
  'Admin User',
  'admin@safetrip.test',
  '$2b$10$...',  -- bcrypt hash of 'password123'
  'admin',
  'BLK-ADMIN001'
);

-- Add tourist user
INSERT INTO users (name, email, password, role, blockchain_id)
VALUES (
  'Test Tourist',
  'tourist@safetrip.test',
  '$2b$10$...',
  'tourist',
  'BLK-TOURIST001'
);
```

Or use the Demo Mode feature in the Admin Dashboard.

### Solution 2: Fix Authentication
If getting 401/403 errors:

1. **Check if logged in:**
   ```javascript
   const user = authAPIService.getCurrentUser();
   console.log('Current user:', user);
   ```

2. **Check user role:**
   ```javascript
   console.log('User role:', user.role);
   // Should be 'admin' or 'authority'
   ```

3. **Re-login:**
   - Logout and login again
   - Clear browser cookies/localStorage
   - Use correct admin credentials

### Solution 3: Fix API Connection
If getting network errors:

1. **Check backend is running:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check environment variable:**
   ```bash
   # .env file
   VITE_API_URL=http://localhost:5000
   ```

3. **Restart both servers:**
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run dev
   ```

### Solution 4: Use Demo Mode
The Admin Dashboard has a "Demo Mode" feature:

1. Navigate to Admin Dashboard
2. Click "Demo Mode" tab
3. Click "Generate Demo Users"
4. Click "Generate Demo Incidents"
5. Go back to "Users" tab
6. Users should now appear

---

## Improved Logging (Already Added)

The Admin Dashboard now has comprehensive logging:

```javascript
// Console output when fetching users:
[AdminDashboard] Fetching users from: http://localhost:5000/api/users
[AdminDashboard] Fetch response status: 200
[AdminDashboard] ✅ Users fetched from API: 6
[AdminDashboard] User sample: { id: '...', name: 'Test User', email: '...', role: 'tourist' }
[AdminDashboard] All users: [...]
[AdminDashboard] Rendering users view, cached users: 6
[AdminDashboard] Filtered users: 6
```

**Error cases:**
```javascript
[AdminDashboard] ❌ Failed to fetch users: 401 Unauthorized
[AdminDashboard] ❌ Error fetching users: TypeError: Failed to fetch
[AdminDashboard] Error details: ...
```

---

## Quick Fix Checklist

- [ ] Backend server is running (`npm run server`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Logged in as admin user
- [ ] Check browser console for errors
- [ ] Check Network tab for `/api/users` request
- [ ] Verify database has users (`SELECT COUNT(*) FROM users`)
- [ ] Try Demo Mode to generate test data
- [ ] Clear browser cache and cookies
- [ ] Re-login with admin credentials

---

## Expected Behavior

When working correctly, you should see:

1. **Stats Cards:**
   - X Tourists
   - X Authorities  
   - X Admins
   - X Total Users

2. **Users Table:**
   - Full Name column
   - Email column
   - Role column (tourist/authority/admin)
   - Blockchain ID column
   - Status column (✓ Active)
   - Actions column (Delete button)

3. **Console Logs:**
   ```
   [AdminDashboard] ✅ Users fetched from API: 6
   [AdminDashboard] Rendering users view, cached users: 6
   ```

---

## Related Files

- **Frontend:** `src/pages/AdminDashboard.js`
- **Backend:** `server/index.js` (line ~807: `app.get('/api/users')`)
- **Auth:** `src/services/auth-api.js`
- **Database:** `server/db.js`

---

## Commit Information

**Commit:** `11bbb62`
**Message:** Add comprehensive logging and error handling to Admin Dashboard user fetching
**Changes:** Improved error messages, detailed console logging, user-friendly notifications

