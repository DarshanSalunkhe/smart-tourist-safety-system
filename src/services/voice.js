// Voice Command Service

// Maps i18n language codes → BCP-47 speech locale codes
const LANG_MAP = {
  en: 'en-US',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
};

/**
 * Check if text contains mixed scripts (e.g., English + Hindi)
 * @param {string} text - Text to check
 * @returns {boolean} - True if mixed scripts detected
 */
function hasMixedScripts(text) {
  const hasDevanagari = LANG_PATTERNS.hi.test(text);
  const hasTamil = LANG_PATTERNS.ta.test(text);
  const hasTelugu = LANG_PATTERNS.te.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  
  const scriptCount = [hasDevanagari, hasTamil, hasTelugu, hasLatin].filter(Boolean).length;
  return scriptCount > 1;
}

/**
 * Clean text for TTS - remove mixed scripts, keep only one language
 * @param {string} text - Text to clean
 * @param {string} preferredLang - Preferred language to keep
 * @returns {string} - Cleaned text
 */
function cleanTextForTTS(text, preferredLang = 'en') {
  if (!hasMixedScripts(text)) return text;
  
  console.warn('[Voice] Mixed scripts detected in text, cleaning...');
  
  // If preferred language is English, remove all non-Latin characters
  if (preferredLang === 'en') {
    const cleaned = text.replace(/[^\x00-\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('[Voice] Cleaned to English only:', cleaned);
    return cleaned || 'Response contains non-English text';
  }
  
  // Otherwise, remove Latin characters and keep Indian script
  const cleaned = text.replace(/[a-zA-Z]/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('[Voice] Cleaned to Indian language only:', cleaned);
  return cleaned || text; // Fallback to original if cleaning removes everything
}

// Language detection patterns (Unicode ranges for Indian scripts)
const LANG_PATTERNS = {
  // Devanagari script (Hindi/Marathi)
  hi: /[\u0900-\u097F]/,
  mr: /[\u0900-\u097F]/,
  // Tamil script
  ta: /[\u0B80-\u0BFF]/,
  // Telugu script
  te: /[\u0C00-\u0C7F]/,
  // English (Latin alphabet)
  en: /^[a-zA-Z0-9\s.,!?'"()-]+$/
};

/**
 * Detect language of text based on script/characters
 * @param {string} text - Text to analyze
 * @returns {string} - Language code (en, hi, mr, ta, te)
 */
function detectLanguage(text) {
  if (!text || text.trim().length === 0) return 'en';
  
  const trimmed = text.trim();
  
  // Check for Indian scripts first (more specific)
  if (LANG_PATTERNS.ta.test(trimmed)) {
    console.log('[Voice] Detected Tamil script');
    return 'ta';
  }
  if (LANG_PATTERNS.te.test(trimmed)) {
    console.log('[Voice] Detected Telugu script');
    return 'te';
  }
  if (LANG_PATTERNS.hi.test(trimmed)) {
    // Devanagari could be Hindi or Marathi - check user preference
    const savedLang = localStorage.getItem('language') || 'en';
    if (savedLang === 'mr') {
      console.log('[Voice] Detected Devanagari script (Marathi preference)');
      return 'mr';
    }
    console.log('[Voice] Detected Devanagari script (Hindi)');
    return 'hi';
  }
  
  // Default to English
  console.log('[Voice] Detected English/Latin script');
  return 'en';
}

// PERMANENT VOICE PREFERENCES: Preferred voices per language (in priority order)
// If these are found, they will ALWAYS be used. Others are blocked.
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

function getSpeechLang() {
  const saved = localStorage.getItem('language') || 'en';
  return LANG_MAP[saved] || 'en-US';
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
      console.log(`[Voice] ✅ Found preferred voice: ${voice.name}`);
      return voice;
    }
  }
  
  return null;
}

class VoiceService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.enabled = false;
    this._aiMode = false;
    this.voicesLoaded = false;
    this.cachedVoice = null; // In-memory cache
    this.lastWorkingVoices = {}; // Per-language successful voices

    // Load last working voices from localStorage
    this.loadLastWorkingVoices();

    // Load voices for TTS
    this.loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = getSpeechLang(); // ← uses selected language
      this.setupRecognition();
    }

    // Update recognition language when user switches language
    window.addEventListener('languageChange', () => {
      if (this.recognition) this.recognition.lang = getSpeechLang();
    });
  }

  loadVoices() {
    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        console.log(`[Voice] Loaded ${voices.length} voices`);
        // Log available Indian language voices
        const indianVoices = voices.filter(v => 
          v.lang.includes('hi') || v.lang.includes('mr') || 
          v.lang.includes('ta') || v.lang.includes('te')
        );
        if (indianVoices.length > 0) {
          console.log('[Voice] Indian language voices:', indianVoices.map(v => `${v.name} (${v.lang})`).join(', '));
        } else {
          console.warn('[Voice] No Indian language voices found. Voice output may fall back to default.');
        }
      }
    }
  }

  // Load last working voices from localStorage
  loadLastWorkingVoices() {
    try {
      const saved = localStorage.getItem('lastWorkingVoices');
      if (saved) {
        this.lastWorkingVoices = JSON.parse(saved);
        console.log('[Voice] Loaded last working voices:', this.lastWorkingVoices);
      }
    } catch (e) {
      console.warn('[Voice] Failed to load last working voices:', e);
      this.lastWorkingVoices = {};
    }
  }

  // Save successful voice to localStorage
  saveLastWorkingVoice(langPrefix, voiceName) {
    try {
      this.lastWorkingVoices[langPrefix] = voiceName;
      localStorage.setItem('lastWorkingVoices', JSON.stringify(this.lastWorkingVoices));
      console.log(`[Voice] Saved working voice for ${langPrefix}: ${voiceName}`);
    } catch (e) {
      console.warn('[Voice] Failed to save working voice:', e);
    }
  }

  // ── Text-to-speech ────────────────────────────────────────
  // lang param: language code (e.g., 'en-US', 'hi-IN'), or 'auto' to detect from text
  speak(text, lang = 'auto') {
    if (!window.speechSynthesis) {
      console.error('[Voice] speechSynthesis not available');
      return;
    }
    
    // CRITICAL FIX: Detect language from text content if 'auto'
    let speechLang;
    let detectedLang;
    if (lang === 'auto') {
      detectedLang = detectLanguage(text);
      speechLang = LANG_MAP[detectedLang] || 'en-US';
      console.log(`[Voice] Auto-detected language: ${detectedLang} → ${speechLang}`);
      
      // Clean mixed-script text
      if (hasMixedScripts(text)) {
        text = cleanTextForTTS(text, detectedLang);
      }
    } else {
      speechLang = lang;
      detectedLang = lang.split('-')[0];
    }
    
    console.log(`[Voice] Speaking in ${speechLang}, text: "${text.substring(0, 50)}..."`);
    
    const voices = window.speechSynthesis.getVoices();
    
    // CRITICAL FIX: Wait for voices to load if empty
    if (!voices.length) {
      console.warn('[Voice] Voices not loaded yet, retrying in 500ms...');
      setTimeout(() => this.speak(text, lang), 500);
      return;
    }
    
    console.log(`[Voice] Total voices available: ${voices.length}`);
    
    const langPrefix = detectedLang || speechLang.split('-')[0];
    
    // Try to use cached voice first (performance optimization)
    if (this.cachedVoice && 
        this.cachedVoice.lang.startsWith(langPrefix) && 
        !isVoiceBroken(this.cachedVoice)) {
      console.log(`[Voice] ✅ Using cached voice: ${this.cachedVoice.name}`);
      this._speakWithVoice(text, this.cachedVoice, speechLang, langPrefix);
      return;
    }
    
    // NEW: Try last working voice from localStorage
    const lastWorkingName = this.lastWorkingVoices[langPrefix];
    if (lastWorkingName) {
      const lastVoice = voices.find(v => 
        v.name === lastWorkingName && 
        !isVoiceBroken(v)
      );
      if (lastVoice) {
        console.log(`[Voice] ✅ Using last working voice: ${lastVoice.name}`);
        this.cachedVoice = lastVoice;
        this._speakWithVoice(text, lastVoice, speechLang, langPrefix);
        return;
      } else {
        console.warn(`[Voice] Last working voice "${lastWorkingName}" not available`);
      }
    }
    
    // WHITELIST APPROACH: Only use voices from PREFERRED_VOICES list
    let voice = findPermanentVoice(voices, langPrefix);
    
    if (voice) {
      const voiceType = (voice.name.includes('Online') || voice.name.includes('Natural')) ? 'ONLINE' : 'LOCAL';
      console.log(`[Voice] ✅ Using ${voiceType} PERMANENT voice: ${voice.name} (${voice.lang})`);
      
      if (voiceType === 'ONLINE') {
        console.log(`[Voice] ℹ️ Using online voice from whitelist - tested and working`);
      }
      
      // Check if using fallback language
      const voiceLangPrefix = voice.lang.split('-')[0];
      if (voiceLangPrefix !== langPrefix) {
        console.warn(`[Voice] ℹ️ Using ${voiceLangPrefix.toUpperCase()} voice for ${langPrefix.toUpperCase()} text (preferred ${langPrefix.toUpperCase()} voice not available)`);
      }
      
      // Cache successful voice
      this.cachedVoice = voice;
    } else {
      console.error(`[Voice] ❌ No preferred voice found for ${speechLang}!`);
      console.error(`[Voice] Available voices:`, voices.map(v => v.name).join(', '));
      console.error(`[Voice] Add working voice to PREFERRED_VOICES in voice.js`);
      
      // IMPROVED Emergency fallback: Prefer LOCAL voices, avoid Online
      voice = voices.find(v => 
        v.lang.startsWith(langPrefix) && 
        !isVoiceBroken(v) &&
        !v.name.includes('Online')
      );
      
      // If still nothing, try any non-broken voice for language
      if (!voice) {
        voice = voices.find(v => 
          v.lang.startsWith(langPrefix) && 
          !isVoiceBroken(v)
        );
      }
      
      // Final fallback: en-IN for Indian languages
      if (!voice && ['hi', 'mr', 'ta', 'te'].includes(langPrefix)) {
        console.warn(`[Voice] Using en-IN as final fallback`);
        voice = voices.find(v => v.lang === 'en-IN');
      }
      
      if (voice) {
        console.warn(`[Voice] ⚠️ Using emergency fallback: ${voice.name}`);
      }
    }
    
    this._speakWithVoice(text, voice, speechLang, langPrefix);
  }
  
  // Helper method to actually speak with a voice
  _speakWithVoice(text, voice, speechLang, langPrefix) {
    // Only cancel if there's actually something speaking
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice ? voice.lang : speechLang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => {
      console.log(`[Voice] 🔊 Started speaking with: ${voice ? voice.name : 'default'}`);
      // Save successful voice to localStorage
      if (voice) {
        this.saveLastWorkingVoice(langPrefix, voice.name);
      }
    };
    
    utterance.onend = () => {
      console.log('[Voice] ✅ Finished speaking');
    };
    
    utterance.onerror = (e) => {
      console.error('[Voice] ❌ Speech error:', e.error);
      console.error('[Voice] Voice that failed:', voice ? voice.name : 'unknown');
      if (e.error === 'synthesis-failed' || e.error === 'network') {
        console.error('[Voice] This voice may be broken. Add to BROKEN_VOICES blacklist.');
        // Clear cached voice if it failed
        if (this.cachedVoice && voice && this.cachedVoice.name === voice.name) {
          this.cachedVoice = null;
        }
        // Remove from last working voices
        if (this.lastWorkingVoices[langPrefix] === voice.name) {
          delete this.lastWorkingVoices[langPrefix];
          localStorage.setItem('lastWorkingVoices', JSON.stringify(this.lastWorkingVoices));
          console.log(`[Voice] Removed failed voice from last working: ${voice.name}`);
        }
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }

  // ── Ask AI by voice and speak the response ────────────────
  async askAIByVoice(text) {
    try {
      const { askChatbot } = await import('./chatService.js');
      const { riskEngine } = await import('./risk-engine.js');
      const { authAPIService } = await import('./auth-api.js');

      const riskData = riskEngine.getStatus();
      const user = authAPIService.getCurrentUser();
      const result = await askChatbot(user?.id, text, riskData);
      const response = result?.response || 'Sorry, I could not get a response.';

      // Speak response in selected language (backend returns translated text)
      this.speak(response, 'auto');

      // Also push into the chatbot widget if it's open
      window.dispatchEvent(new CustomEvent('voiceAIResponse', {
        detail: { question: text, answer: response }
      }));

      return response;
    } catch (err) {
      console.error('[VoiceService] AI query failed:', err);
      this.speak('Sorry, I could not reach the AI right now.', 'auto');
    }
  }

  // ── Single-shot AI listening mode ─────────────────────────
  async startAIListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !this.recognition) {
      console.warn('[VoiceService] Speech recognition not supported in this browser/context');
      window.dispatchEvent(new CustomEvent('voiceAIError', { detail: { error: 'not-supported' } }));
      return;
    }

    // Fix 4: force mic permission first — this also surfaces the permission dialog on mobile
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('[VoiceService] Mic permission denied:', err);
      window.dispatchEvent(new CustomEvent('voiceAIError', { detail: { error: 'not-allowed' } }));
      return;
    }

    // Stop any ongoing continuous session
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }

    this._aiMode = true;
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    // Always use en-US for recognition — most reliable across all devices.
    // Hindi/Marathi/Tamil/Telugu speech is still recognized by Chrome's en-US model.
    // Setting mr-IN or hi-IN requires those speech packs installed on the device.
    this.recognition.lang = 'en-US';

    // Fix 3: debug event logs
    this.recognition.onstart  = () => console.log('🎤 mic started');
    this.recognition.onend    = () => {
      console.log('🛑 mic ended');
      this._aiMode = false;
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.isListening = false;
      this.setupRecognition();
    };
    this.recognition.onerror  = (e) => {
      console.log('❌ mic error:', e.error);
      this._aiMode = false;
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.setupRecognition();
      window.dispatchEvent(new CustomEvent('voiceAIError', { detail: { error: e.error } }));
    };
    this.recognition.onresult = async (e) => {
      console.log('📝 result received', e.results);
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      window.dispatchEvent(new CustomEvent('voiceInterimText', {
        detail: { text: transcript, interim: !e.results[e.results.length - 1].isFinal }
      }));
      if (e.results[e.results.length - 1].isFinal) {
        const text = transcript.trim();
        console.log('[VoiceService] Final transcript:', text);
        await this.askAIByVoice(text);
      }
    };

    // Speak prompt in selected language, then start mic only after audio fully finishes.
    // Use a generous timeout fallback because speechSynthesis.onend fires early on some browsers.
    const { i18n } = await import('./i18n.js');
    const promptText = i18n.t('voice_ask_question');
    const prompt = new SpeechSynthesisUtterance(promptText);
    prompt.lang = getSpeechLang(); // prompt uses selected language
    prompt.rate = 0.95;

    let micStarted = false;
    const startMic = () => {
      if (micStarted) return;
      micStarted = true;
      try {
        this.recognition.start();
        this.isListening = true;
        window.dispatchEvent(new CustomEvent('voiceListeningStarted'));
      } catch (e) {
        console.error('[VoiceService] Failed to start recognition:', e);
        this._aiMode = false;
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.setupRecognition();
        window.dispatchEvent(new CustomEvent('voiceAIError', { detail: { error: 'start-failed' } }));
      }
    };

    // Estimate prompt duration: ~100ms per character, min 1500ms, max 5000ms
    const estimatedMs = Math.min(5000, Math.max(1500, promptText.length * 80));

    prompt.onend = () => setTimeout(startMic, 600); // 600ms gap after TTS ends
    // Fallback: if onend never fires (browser bug), start mic after estimated duration
    setTimeout(startMic, estimatedMs + 800);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(prompt);
  }

  setupRecognition() {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.toLowerCase().trim();
      console.log('🎤 Voice command:', text);

      if (this.isEmergencyPhrase(text)) {
        this.triggerVoiceSOS(text);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      if (event.error === 'no-speech' && this.enabled) {
        setTimeout(() => this.start(), 1000);
      }
    };

    this.recognition.onend = () => {
      if (this.enabled && !this._aiMode) {
        this.start();
      }
    };
  }

  isEmergencyPhrase(text) {
    return ['help me', 'help me now', 'emergency', 'i need help',
            'call police', 'sos', 'danger'].some(p => text.includes(p));
  }

  triggerVoiceSOS(phrase) {
    console.log('🚨 Voice SOS triggered:', phrase);
    import('./incident.js').then(({ incidentService }) => {
      import('./auth-api.js').then(({ authAPIService }) => {
        import('./location.js').then(({ locationService }) => {
          const user = authAPIService.getCurrentUser();
          const location = locationService.getCurrentLocation() || locationService.getLastSavedLocation();
          if (user) {
            incidentService.triggerSOS(user.id, location, 'voice');
            this.showVoiceSOSFeedback();
          }
        });
      });
    });
  }

  showVoiceSOSFeedback() {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:var(--danger);color:white;padding:2rem 3rem;
      border-radius:1rem;font-size:1.5rem;font-weight:bold;
      z-index:10000;box-shadow:0 10px 40px rgba(0,0,0,.3);
    `;
    feedback.textContent = '🚨 VOICE SOS ACTIVATED';
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 3000);
  }

  start() {
    if (!this.recognition) { console.warn('Voice recognition not supported'); return false; }
    try {
      this.recognition.start();
      this.isListening = true;
      this.enabled = true;
      console.log('🎤 Voice commands enabled');
      return true;
    } catch (e) {
      console.error('Failed to start voice recognition:', e);
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.enabled = false;
      console.log('🎤 Voice commands disabled');
    }
  }

  toggle() {
    return this.enabled ? (this.stop(), false) : this.start();
  }
}

export const voiceService = new VoiceService();
