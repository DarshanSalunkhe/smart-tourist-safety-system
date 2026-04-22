import { voiceLogsAPI } from './apiClient.js';

const langMap = { en:'en-US', hi:'hi-IN', mr:'mr-IN', ta:'ta-IN', te:'te-IN' };

// PERMANENT VOICE PREFERENCES: Preferred voices per language (in priority order)
const PREFERRED_VOICES = {
  'hi': [
    // NO Hindi voices - all are broken (synthesis-failed)
    // Use Marathi voices instead (both use Devanagari script)
    'Microsoft आरोही',           // Marathi (works!)
    'Microsoft Aarohi',          // Marathi alternate name
    'Microsoft मनोहर',           // Marathi alternate
    'Microsoft Manohar',         // Marathi alternate name
    'Google मराठी',              // Google Marathi
  ],
  'mr': [
    'Microsoft आरोही',           // Marathi Online (works)
    'Microsoft Aarohi',          // Alternate name
    'Microsoft मनोहर',           // Alternate Marathi
    'Microsoft Manohar',         // Alternate name
    'Google मराठी',              // Google Marathi
  ],
  'ta': [
    'Microsoft பல்லவி',          // Tamil Online (works)
    'Microsoft Pallavi',         // Alternate name
    'Microsoft Heera',           // Alternate Tamil voice
    'Google தமிழ்',              // Google Tamil
  ],
  'te': [
    'Microsoft శ్రుతి',          // Telugu Online (works)
    'Microsoft Shruti',          // Alternate name
    'Google తెలుగు',             // Google Telugu
  ],
  'en': [
    'Microsoft David',           // Local English (works)
    'Microsoft Zira',            // Alternate local
    'Google US English',         // Google English
  ]
};

// BLACKLIST: ALL Hindi voices are broken (synthesis-failed on this system)
const BROKEN_VOICES = [
  // Hindi voices - ALL broken (synthesis-failed)
  'Microsoft आरव',
  'Microsoft Aarav',
  'Microsoft अनन्या',
  'Microsoft Ananya',
  'Microsoft आरती',
  'Microsoft Aarti',
  'Microsoft अर्जुन',
  'Microsoft Arjun',
  'Microsoft काव्या',
  'Microsoft Kavya',
  'Microsoft कुनाल',
  'Microsoft Kunal',
  'Microsoft रेहान',
  'Microsoft Rehan',
  'Microsoft स्वरा',
  'Microsoft Swara',
  'Microsoft मधुर',
  'Microsoft Madhur',
];

// Cache available voices
let availableVoices = [];
let voicesLoaded = false;

function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
  voicesLoaded = true;
}

// Load voices on init and when they change
if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Check if a voice is in the blacklist
function isVoiceBroken(voice) {
  return BROKEN_VOICES.some(broken => voice.name.includes(broken) || broken.includes(voice.name));
}

// Find permanent voice for language using WHITELIST approach
function findPermanentVoice(voices, langPrefix) {
  const preferredList = PREFERRED_VOICES[langPrefix] || [];
  
  // Try each preferred voice in order (case-insensitive matching)
  for (const preferred of preferredList) {
    const voice = voices.find(v => 
      v.name.toLowerCase().includes(preferred.toLowerCase()) && 
      !isVoiceBroken(v)
    );
    if (voice) {
      return voice;
    }
  }
  
  return null;
}

// Find best voice for language - WHITELIST approach with BLACKLIST filter
function findVoiceForLang(lang) {
  if (!voicesLoaded || availableVoices.length === 0) {
    availableVoices = window.speechSynthesis.getVoices();
  }
  
  const langPrefix = lang.split('-')[0];
  
  // Use whitelist approach
  const voice = findPermanentVoice(availableVoices, langPrefix);
  if (voice) return voice;
  
  // Emergency fallback: any non-broken voice for the language
  return availableVoices.find(v => 
    v.lang.startsWith(langPrefix) && 
    !isVoiceBroken(v)
  );
}

export function speakAlert(text, customLang = null) {
  const lang = customLang || langMap[localStorage.getItem('language') || 'en'] || 'en-US';
  
  const voices = window.speechSynthesis.getVoices();
  
  // CRITICAL FIX: Wait for voices to load if empty
  if (!voices.length) {
    console.warn('[Voice] Voices not loaded yet, retrying in 500ms...');
    setTimeout(() => speakAlert(text, customLang), 500);
    return;
  }
  
  // Only cancel if there's actually something speaking
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = lang;
  
  // Try to find a suitable voice using WHITELIST approach
  const voice = findVoiceForLang(lang);
  if (voice) {
    speech.voice = voice;
    const voiceType = (voice.name.includes('Online') || voice.name.includes('Natural')) ? 'ONLINE' : 'LOCAL';
    console.log(`[Voice] Using ${voiceType} PERMANENT voice: ${voice.name} (${voice.lang})`);
    
    if (voiceType === 'ONLINE') {
      console.log(`[Voice] ℹ️ Using online voice from whitelist - tested and working`);
    }
    
    const langPrefix = lang.split('-')[0];
    const voiceLangPrefix = voice.lang.split('-')[0];
    if (voiceLangPrefix !== langPrefix) {
      console.warn(`[Voice] ℹ️ Using ${voiceLangPrefix.toUpperCase()} voice for ${langPrefix.toUpperCase()} text`);
    }
  } else {
    console.error(`[Voice] ❌ No preferred voice found for ${lang}!`);
    console.error(`[Voice] Add working voice to PREFERRED_VOICES in voiceService.js`);
  }
  
  speech.rate = 0.9;
  speech.pitch = 1;
  speech.volume = 1;
  
  // Error handling
  speech.onerror = (e) => {
    console.error('[Voice] Speech error:', e.error);
    console.error('[Voice] Voice that failed:', voice ? voice.name : 'unknown');
    if (e.error === 'not-allowed') {
      console.warn('[Voice] Speech not allowed - user may need to enable it');
    } else if (e.error === 'synthesis-failed' || e.error === 'network') {
      console.error('[Voice] This voice may be broken. Add to BROKEN_VOICES blacklist.');
    }
  };
  
  window.speechSynthesis.speak(speech);
}

// Check if voice is available for a language
export function isVoiceAvailable(lang) {
  const voice = findVoiceForLang(lang);
  return !!voice;
}

// Get list of available languages
export function getAvailableLanguages() {
  if (!voicesLoaded || availableVoices.length === 0) {
    availableVoices = window.speechSynthesis.getVoices();
  }
  
  const langs = new Set();
  availableVoices.forEach(v => {
    const prefix = v.lang.split('-')[0];
    langs.add(prefix);
  });
  
  return Array.from(langs);
}

export async function saveVoiceLog(incidentId, audioUrl) {
  return voiceLogsAPI.save(incidentId, audioUrl);
}