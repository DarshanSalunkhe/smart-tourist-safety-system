require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function check() {
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    .getGenerativeModel({ model: 'gemini-2.0-flash-lite', generationConfig: { maxOutputTokens: 20 } });
  try {
    const r = await model.generateContent('Say: OK');
    console.log('✅ Gemini working:', r.response.text().trim());
  } catch (e) {
    const m = e.message || '';
    if (m.includes('429')) console.error('❌ Quota exceeded');
    else if (m.includes('404')) console.error('❌ Model not found');
    else if (m.includes('403') || m.includes('API_KEY')) console.error('❌ Invalid key');
    else console.error('❌', m.substring(0, 150));
  }
}

check();
