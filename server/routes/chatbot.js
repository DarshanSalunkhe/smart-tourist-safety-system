const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateSafetyReply } = require('../services/chatbotService');

router.post('/', async (req, res) => {
  // Accept both { riskData: { score, level } } and flat { riskScore, riskLevel }
  const { userId, message, riskData, riskScore, riskLevel, lang, language } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const normalizedRiskData = riskData || {
    score: riskScore ?? 0,
    level: riskLevel ?? 'Unknown',
  };

  const resolvedLang = lang || language || 'en';
  
  console.log('[Chatbot API] Received request:');
  console.log('  - Message:', message);
  console.log('  - Language:', resolvedLang);
  console.log('  - Risk Data:', normalizedRiskData);

  // generateSafetyReply is now async (Gemini fallback)
  const response = await generateSafetyReply(message, normalizedRiskData, resolvedLang);
  
  console.log('[Chatbot API] Generated response:', response.substring(0, 100));
  console.log('[Chatbot API] Response contains Hindi:', /[\u0900-\u097F]/.test(response));

  try {
    await db.pool.query(
      'INSERT INTO chat_logs (user_id, message, response) VALUES ($1, $2, $3)',
      [userId || null, message, response]
    );
  } catch (err) {
    console.error('[Chatbot] Failed to log chat:', err.message);
  }

  res.json({ response });
});

module.exports = router;
