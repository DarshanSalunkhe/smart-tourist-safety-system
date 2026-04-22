'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// ── Load JSON response files ──────────────────────────────────
function loadResponses() {
  const langs = ['en', 'hi', 'mr', 'ta', 'te'];
  const r = {};
  for (const lang of langs) {
    const file = path.join(__dirname, '../data/responses', lang + '.json');
    try { r[lang] = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { console.warn('[Chatbot] Missing responses/' + lang + '.json'); r[lang] = {}; }
  }
  return r;
}
const RESPONSES = loadResponses();

// Startup validation — fail fast if critical responses missing
const CRITICAL = ['sos', 'emergency', 'default'];
for (const key of CRITICAL) {
  if (!RESPONSES.en[key]) console.error('[Chatbot] MISSING critical response key:', key);
}

// ── O(1) keyword -> intent maps (precomputed at startup) ──────
const KEYWORD_MAP = {
  'sos': 'sos',
  'emergency': 'emergency',
  'aapatkaal': 'emergency',
  'avasara': 'emergency',
  'helpline': 'emergency',
  'zone': 'zone',
  'area': 'zone',
  'kshetra': 'zone',
  'safe': 'safe',
  'precaution': 'safe',
  'surakshit': 'safe',
  'suraksha': 'safe',
  'paadhukaappu': 'safe',
  'scam': 'scam',
  'fraud': 'scam',
  'cheat': 'scam',
  'dhokha': 'scam',
  'fasavnook': 'scam',
  'mosam': 'scam',
  'swindle': 'scam',
  'con': 'scam',
  'night': 'night',
  'dark': 'night',
  'late': 'night',
  'raat': 'night',
  'raatri': 'night',
  'midnight': 'night',
  'evening': 'night',
  'help': 'help',
  'feature': 'help',
  'madad': 'help',
  'madat': 'help',
  'sahayam': 'help',
  'udavi': 'help',
  'assist': 'help',
  'local': 'local',
  'advice': 'local',
  'tip': 'local',
  'sujhaav': 'local',
  'guide': 'local',
  'sms': 'sms',
  'message': 'sms',
  'sandesh': 'sms',
  'text': 'sms',
  'offline': 'offline',
  'oflaain': 'offline',
  'disconnected': 'offline',
  'tracking': 'tracking',
  'location': 'tracking',
  'gps': 'tracking',
  'lost': 'lost',
  'missing': 'lost',
  'kho': 'lost',
  'harvalyaas': 'lost',
  'passport': 'passport',
  'visa': 'passport',
  'document': 'passport',
  'wallet': 'wallet',
  'purse': 'wallet',
  'batua': 'wallet',
  'phone': 'phone',
  'mobile': 'phone',
  'smartphone': 'phone',
  'iphone': 'phone',
  'android': 'phone',
  'medical': 'medical',
  'sick': 'medical',
  'ill': 'medical',
  'doctor': 'medical',
  'chikitsa': 'medical',
  'unwell': 'medical',
  'hurt': 'medical',
  'injured': 'medical',
  'pain': 'medical',
  'hospital': 'hospital',
  'clinic': 'hospital',
  'nursing': 'hospital',
  'dispensary': 'hospital',
  'police': 'police',
  'cop': 'police',
  'fir': 'police',
  'thana': 'police',
  'officer': 'police',
  'constable': 'police',
  'ambulance': 'ambulance',
  '108': 'ambulance',
  'fire': 'fire',
  'aag': 'fire',
  'burning': 'fire',
  'flames': 'fire',
  'flood': 'flood',
  'baadhh': 'flood',
  'waterlogged': 'flood',
  'submerged': 'flood',
  'transport': 'transport',
  'travel': 'transport',
  'commute': 'transport',
  'taxi': 'taxi',
  'cab': 'taxi',
  'auto': 'taxi',
  'rickshaw': 'taxi',
  'ola': 'taxi',
  'uber': 'taxi',
  'rapido': 'taxi',
  'train': 'train',
  'railway': 'train',
  'irctc': 'train',
  'metro': 'train',
  'rail': 'train',
  'bus': 'bus',
  'volvo': 'bus',
  'food': 'food',
  'eat': 'food',
  'restaurant': 'food',
  'khana': 'food',
  'meal': 'food',
  'dining': 'food',
  'hungry': 'food',
  'water': 'water',
  'drink': 'water',
  'paani': 'water',
  'thirst': 'water',
  'hydrate': 'water',
  'weather': 'weather',
  'rain': 'weather',
  'monsoon': 'weather',
  'mausam': 'weather',
  'forecast': 'predict',
  'climate': 'weather',
  'heat': 'heat',
  'hot': 'heat',
  'summer': 'heat',
  'garmi': 'heat',
  'sunstroke': 'heat',
  'dehydration': 'heat',
  'atm': 'atm',
  'withdraw': 'atm',
  'money': 'money',
  'cash': 'money',
  'rupee': 'money',
  'paisa': 'money',
  'upi': 'money',
  'payment': 'money',
  'pay': 'money',
  'hotel': 'hotel',
  'accommodation': 'hotel',
  'stay': 'hotel',
  'lodge': 'hotel',
  'hostel': 'hotel',
  'airbnb': 'hotel',
  'room': 'hotel',
  'language': 'language',
  'translate': 'language',
  'barrier': 'language',
  'hindi': 'language',
  'english': 'language',
  'speak': 'language',
  'wifi': 'wifi',
  'internet': 'wifi',
  'data': 'wifi',
  'network': 'wifi',
  'connectivity': 'wifi',
  'hotspot': 'wifi',
  'battery': 'battery',
  'charge': 'battery',
  'number': 'numbers',
  'women': 'women',
  'female': 'women',
  'girl': 'women',
  'lady': 'women',
  'mahila': 'women',
  'theft': 'theft',
  'stolen': 'theft',
  'chori': 'theft',
  'pickpocket': 'theft',
  'robbed': 'theft',
  'robbery': 'theft',
  'harass': 'harassment',
  'molestation': 'harassment',
  'utpeedan': 'harassment',
  'stalking': 'harassment',
  'threat': 'harassment',
  'accident': 'accident',
  'crash': 'accident',
  'collision': 'accident',
  'hit': 'accident',
  'currency': 'currency',
  'exchange': 'currency',
  'forex': 'currency',
  'dollar': 'currency',
  'euro': 'currency',
  'convert': 'currency',
  'sim': 'sim',
  'telecom': 'sim',
  'jio': 'sim',
  'airtel': 'sim',
  'vi': 'sim',
  'bsnl': 'sim',
  'prepaid': 'sim',
  'blockchain': 'id',
  'blk': 'id',
  'predict': 'predict',
  'prediction': 'predict',
  'report': 'report',
  'incident': 'report',
  'complaint': 'report',
  'hello': 'greeting',
  'hi': 'greeting',
  'hey': 'greeting',
  'namaste': 'greeting',
  'namaskar': 'greeting',
  'vanakkam': 'greeting',
  'thank': 'thanks',
  'thanks': 'thanks',
  'shukriya': 'thanks',
  'dhanyavaad': 'thanks',
  'nandri': 'thanks',
  'dhanyawad': 'thanks',
};

// Multi-word phrases (precomputed, avoids scanning all keys)
const PHRASES = [
  ['no internet', 'offline'],
  ['share location', 'tracking'],
  ['cant find', 'lost'],
  ['where am i', 'lost'],
  ['id proof', 'passport'],
  ['bag stolen', 'wallet'],
  ['health center', 'hospital'],
  ['get around', 'transport'],
  ['state bus', 'bus'],
  ['bottled water', 'water'],
  ['cash machine', 'atm'],
  ['power bank', 'battery'],
  ['low battery', 'battery'],
  ['dead phone', 'battery'],
  ['contact number', 'numbers'],
  ['phone number', 'numbers'],
  ['helpline number', 'numbers'],
  ['woman safety', 'women'],
  ['eve tease', 'harassment'],
  ['road accident', 'accident'],
  ['digital id', 'id'],
  ['safety id', 'id'],
  ['qr code', 'id'],
  ['future risk', 'predict'],
  ['risk ahead', 'predict'],
  ['file report', 'report'],
  ['good morning', 'greeting'],
  ['good evening', 'greeting'],
];

// ── Normalize input (removes punctuation, lowercases) ─────────
function normalize(text) {
  return text.toLowerCase()
    .replace(/[-_]/g, ' ')   // hyphens/underscores -> space so night-time -> night time
    .replace(/[^\w\s]/g, '') // remove remaining punctuation
    .replace(/\s+/g, ' ')    // collapse multiple spaces
    .trim();
}

// ── Gemini setup ──────────────────────────────────────────────
let geminiModel = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite', generationConfig: { maxOutputTokens: 80 } });
    console.log('Gemini AI enabled (hybrid mode, gemini-2.0-flash-lite)');
  } catch (e) { console.warn('Gemini init failed:', e.message); }
} else { console.log('Chatbot running in rule-based mode'); }

// ── Response cache ────────────────────────────────────────────
const replyCache = new Map();
const CACHE_MAX = 100;
function cacheGet(lang, msg) { return replyCache.get(lang + ':' + normalize(msg)) || null; }
function cacheSet(lang, msg, reply) {
  const key = lang + ':' + normalize(msg);
  if (replyCache.size >= CACHE_MAX) replyCache.delete(replyCache.keys().next().value);
  replyCache.set(key, reply);
}

// ── Circuit breaker + Gemini ──────────────────────────────────
let geminiDisabledUntil = 0;
async function askGemini(message, riskData, lang) {
  if (!geminiModel || Date.now() < geminiDisabledUntil) return null;
  const cached = cacheGet(lang, message);
  if (cached) return cached;
  const langNames = { en: 'English', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu' };
  const prompt = 'You are SafeTrip, a tourist safety assistant in India. Context: risk score ' +
    (riskData.score || 0) + '/100 (' + (riskData.level || 'Unknown') + '), city: ' +
    (riskData.city || 'unknown') + '. Reply in ' + (langNames[lang] || 'English') +
    ', max 2 sentences, safety focus only. User: ' + message;
  try {
    const result = await Promise.race([
      geminiModel.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    ]);
    const reply = result.response.text().trim();
    cacheSet(lang, message, reply);
    return reply;
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('429') || msg.includes('quota')) { geminiDisabledUntil = Date.now() + 60000; console.warn('[Chatbot] Gemini quota hit'); }
    else if (msg.includes('403') || msg.includes('API_KEY')) { geminiDisabledUntil = Date.now() + 600000; }
    else if (msg.includes('404')) { geminiDisabledUntil = Date.now() + 600000; }
    return null;
  }
}

// ── Intent priority weights ───────────────────────────────────
// Higher = wins when multiple intents match the same message
const INTENT_PRIORITY = {
  sos: 100, emergency: 95, medical: 90, hospital: 90,
  police: 85, ambulance: 85, fire: 85, flood: 85, accident: 85,
  harassment: 80, theft: 80, women: 80,
  lost: 75, passport: 75, wallet: 75, phone: 75,
  night: 70, zone: 70, predict: 70,
  transport: 60, taxi: 60, train: 60, bus: 60,
  food: 55, water: 55, weather: 55, heat: 55, atm: 55, money: 55,
  hotel: 50, wifi: 50, battery: 50, sim: 50, currency: 50,
  safe: 45, scam: 45, local: 45, language: 45,
  sms: 40, offline: 40, tracking: 40,
  help: 35, id: 35, report: 35,
  greeting: 20, thanks: 20,
};

// Urgency signals — boost emergency intent when present
const URGENCY_RE = /urgent|immediately|now|help|asap|quick|fast|hurry|dying|bleeding|critical/i;

// Emergency number patterns — map to emergency intent directly
const EMERGENCY_NUM_RE = /\b(100|101|108|112|1091)\b/;

// ── Intent matching with scoring (best match wins) ────────────
function matchIntent(text) {
  // Emergency number shortcut — highest priority
  if (EMERGENCY_NUM_RE.test(text)) return 'emergency';

  const norm = normalize(text);
  const words = norm.split(/\s+/);
  const scores = {};

  // Score single-word matches
  for (const word of words) {
    const intent = KEYWORD_MAP[word];
    if (intent) scores[intent] = (scores[intent] || 0) + 1;
  }

  // Score phrase matches (worth 3 — stronger signal than repeated words)
  for (const [phrase, intent] of PHRASES) {
    if (norm.includes(phrase)) scores[intent] = (scores[intent] || 0) + 3;
  }

  if (Object.keys(scores).length === 0) return null;

  // Urgency boost: ensure emergency is in the race but cap so strong multi-word
  // intents (e.g. "hospital location urgent") aren't fully overridden
  if (URGENCY_RE.test(text)) {
    scores['emergency'] = Math.max(scores['emergency'] || 0, 20);
  }

  // Multiply raw score by priority ONCE here (single scaling point)
  const finalScores = {};
  for (const [intent, raw] of Object.entries(scores)) {
    finalScores[intent] = raw * (INTENT_PRIORITY[intent] || 50);
  }

  // Safety-first tie-breaker: on equal final score, prefer higher-priority intent
  const best = Object.entries(finalScores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    // Tie: prefer the intent with higher base priority (safety-first)
    return (INTENT_PRIORITY[b[0]] || 50) - (INTENT_PRIORITY[a[0]] || 50);
  })[0][0];

  console.log('[Chatbot] Intent:', best, '| raw:', JSON.stringify(scores), '| final:', JSON.stringify(finalScores));
  return best;
}

// ── Risk-aware response with language fallback hierarchy ───────
function getResponse(intent, lang, score) {
  const r = RESPONSES[lang] || {};
  const en = RESPONSES.en || {};
  // Risk-aware: _high variant when score >= 70
  if (score >= 70) {
    const high = r[intent + '_high'] || en[intent + '_high'];
    if (high) return high;
  }
  // Language fallback hierarchy: lang -> en -> en.default
  return r[intent] || en[intent] || en['default'] || 'Stay alert and keep tracking ON.';
}

// ── Main entry point ──────────────────────────────────────────
async function generateSafetyReply(message, riskData, lang) {
  if (!lang) lang = 'en';
  const text = message.toLowerCase();
  const score = (riskData && riskData.score != null) ? riskData.score : 0;
  const label = (riskData && riskData.level && riskData.level.label)
    ? riskData.level.label
    : (riskData && riskData.level ? String(riskData.level) : 'Unknown');
  const r = RESPONSES[lang] || {};
  const en = RESPONSES.en || {};

  // 1. Risk score query (dynamic — needs live score + label)
  if (text.includes('risk') || text.includes('score') || text.includes('jokhim') ||
      text.includes('dhoka') || text.includes('pramada') || text.includes('aapatthu')) {
    const tmpl = r['risk_tmpl'] || en['risk_tmpl'] || 'Your safety risk score is {s} - {l}. {advice}';

    // Localized advice strings
    const adviceMap = {
      en: { high: 'Move to a crowded area immediately.', med: 'Stay cautious and keep tracking ON.', safe: 'You are in a relatively safe zone.' },
      hi: { high: 'तुरंत भीड़-भाड़ वाले इलाके में जाएं।', med: 'सतर्क रहें और ट्रैकिंग चालू रखें।', safe: 'आप अपेक्षाकृत सुरक्षित क्षेत्र में हैं।' },
      mr: { high: 'ताबडतोब गर्दीच्या भागात जा.', med: 'सावध राहा आणि ट्रॅकिंग चालू ठेवा.', safe: 'तुम्ही तुलनेने सुरक्षित क्षेत्रात आहात.' },
      ta: { high: 'உடனடியாக கூட்டமான பகுதிக்கு செல்லுங்கள்.', med: 'எச்சரிக்கையாக இருங்கள், கண்காணிப்பை இயக்கமாக வைத்திருங்கள்.', safe: 'நீங்கள் ஒப்பீட்டளவில் பாதுகாப்பான பகுதியில் இருக்கிறீர்கள்.' },
      te: { high: 'వెంటనే రద్దీగా ఉన్న ప్రాంతానికి వెళ్ళండి.', med: 'జాగ్రత్తగా ఉండండి, ట్రాకింగ్ ఆన్‌లో ఉంచండి.', safe: 'మీరు సాపేక్షంగా సురక్షితమైన ప్రాంతంలో ఉన్నారు.' },
    };
    const a = adviceMap[lang] || adviceMap.en;
    const advice = score >= 70 ? a.high : score >= 40 ? a.med : a.safe;
    return tmpl.replace('{s}', score).replace('{l}', label).replace('{advice}', advice);
  }

  // 2. O(1) intent match -> risk-aware response
  const intent = matchIntent(text);
  if (intent) return getResponse(intent, lang, score);

  // 3. Gemini fallback (protected)
  try {
    const geminiReply = await askGemini(message, { score, level: label, city: riskData && riskData.city }, lang);
    if (geminiReply) return geminiReply;
  } catch (e) {
    console.error('[Chatbot] Gemini fallback error:', e.message);
  }

  // 4. Final default (language fallback hierarchy)
  const def = r['default'] || en['default'] || 'Stay alert. Keep tracking ON.';
  return def.replace('{l}', label).replace('{s}', score);
}

module.exports = { generateSafetyReply };