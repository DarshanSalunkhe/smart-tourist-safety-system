# Voice Debugging Guide

## Quick Tests

### Test 1: Basic Browser Voice Test
1. Open your browser console (F12)
2. Paste this code:

```javascript
// Test if voice works at all
const utterance = new SpeechSynthesisUtterance('Hello, this is a test');
utterance.lang = 'en-US';
utterance.onstart = () => console.log('✅ Voice started');
utterance.onend = () => console.log('✅ Voice ended');
utterance.onerror = (e) => console.error('❌ Voice error:', e);
window.speechSynthesis.speak(utterance);
```

### Test 2: Hindi Voice Test
```javascript
// Test Hindi voice
const voices = window.speechSynthesis.getVoices();
console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));

const hindiText = 'नमस्ते, यह एक परीक्षण है';
const utterance = new SpeechSynthesisUtterance(hindiText);
utterance.lang = 'hi-IN';

const hindiVoice = voices.find(v => v.lang.startsWith('hi'));
if (hindiVoice) {
  utterance.voice = hindiVoice;
  console.log('✅ Using Hindi voice:', hindiVoice.name);
} else {
  console.warn('⚠️ No Hindi voice found, using default');
}

utterance.onstart = () => console.log('🔊 Speaking Hindi');
utterance.onend = () => console.log('✅ Finished');
utterance.onerror = (e) => console.error('❌ Error:', e);

window.speechSynthesis.speak(utterance);
```

### Test 3: Check Current Language Setting
```javascript
// Check what language is currently selected
console.log('Current language:', localStorage.getItem('language'));
console.log('Should map to:', {
  en: 'en-US',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN'
}[localStorage.getItem('language') || 'en']);
```

### Test 4: Test Voice Service Directly
```javascript
// Import and test the voice service
import('./src/services/voice.js').then(({ voiceService }) => {
  console.log('Voice service loaded');
  voiceService.speak('This is a test in auto mode', 'auto');
});
```

### Test 5: Check Chatbot Response Language
1. Open chatbot widget
2. Switch to Hindi (हिन्दी)
3. Ask: "Risk score?"
4. Open console and check:
   - Is the response text in Hindi?
   - What language is being passed to voice.speak()?

## Common Issues & Solutions

### Issue 1: Voice speaks in English even though text is in Hindi

**Diagnosis:**
```javascript
// Check if response text is actually in Hindi
console.log('Response text:', responseText);
console.log('Contains Hindi characters:', /[\u0900-\u097F]/.test(responseText));
```

**Possible causes:**
- Backend is returning English text (check server logs)
- Language parameter not being sent to backend
- Wrong language file being loaded

**Fix:**
- Verify `localStorage.getItem('language')` returns 'hi'
- Check network tab: does POST to /api/chatbot include `lang: 'hi'`?
- Check server logs: is backend using hi.json?

### Issue 2: No voice at all

**Diagnosis:**
```javascript
// Check if speechSynthesis is available
console.log('speechSynthesis available:', !!window.speechSynthesis);
console.log('Voices loaded:', window.speechSynthesis.getVoices().length);
```

**Possible causes:**
- Browser doesn't support Web Speech API
- Voices not loaded yet
- Audio permissions denied

**Fix:**
- Use Chrome/Edge (best support)
- Wait for voices to load: `window.speechSynthesis.onvoiceschanged`
- Check browser audio permissions

### Issue 3: Wrong voice/accent

**Diagnosis:**
```javascript
// Check which voice is being used
const voices = window.speechSynthesis.getVoices();
const hindiVoices = voices.filter(v => v.lang.includes('hi'));
console.log('Hindi voices available:', hindiVoices);
```

**Possible causes:**
- No Hindi voice pack installed on device
- Browser using default voice

**Fix:**
- Install language packs (see VOICE_SETUP.md)
- On Android: Settings → Text-to-speech → Install voice data
- On iOS: Settings → Accessibility → Voices

## Step-by-Step Debugging

### Step 1: Verify Language Selection
1. Open app
2. Click language switcher
3. Select Hindi (हिन्दी)
4. Open console: `localStorage.getItem('language')` should return `'hi'`

### Step 2: Verify Backend Response
1. Open Network tab (F12)
2. Ask chatbot a question
3. Find POST request to `/api/chatbot`
4. Check Request Payload: should include `lang: 'hi'`
5. Check Response: should contain Hindi text

### Step 3: Verify Voice Service
1. Open console
2. Run: `import('./src/services/voice.js').then(({ voiceService }) => window.vs = voiceService)`
3. Run: `window.vs.speak('नमस्ते', 'hi-IN')`
4. Should speak in Hindi (if voice pack installed)

### Step 4: Check Voice Availability
1. Visit `/quick-voice-test.html`
2. Click "Hindi" button
3. Check output for:
   - "Found voice" or "No voice found"
   - List of available voices
4. If no Hindi voice found, install language pack

## Console Commands for Live Debugging

```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');

// Check current state
console.log('Language:', localStorage.getItem('language'));
console.log('Voices:', window.speechSynthesis.getVoices().map(v => v.lang));

// Test voice service
import('./src/services/voice.js').then(({ voiceService }) => {
  voiceService.speak('Test in auto mode', 'auto');
});

// Force Hindi
localStorage.setItem('language', 'hi');
window.dispatchEvent(new CustomEvent('languageChange', { detail: { lang: 'hi' } }));

// Test chatbot
import('./src/services/chatService.js').then(({ askChatbot }) => {
  askChatbot(1, 'risk score?', { score: 50, level: 'Medium' }).then(result => {
    console.log('Response:', result.response);
    console.log('Is Hindi:', /[\u0900-\u097F]/.test(result.response));
  });
});
```

## Expected Behavior

When working correctly:
1. User selects Hindi from language switcher
2. `localStorage.language` = 'hi'
3. User asks chatbot a question
4. Request to `/api/chatbot` includes `lang: 'hi'`
5. Backend loads `server/data/responses/hi.json`
6. Backend returns Hindi text response
7. Frontend displays Hindi text in chat
8. Voice service detects `language = 'hi'`
9. Voice service maps to `'hi-IN'`
10. Voice service finds Hindi voice (if available)
11. Speaks response in Hindi

## Quick Fix Test

If nothing works, try this minimal test:

```javascript
// Minimal test - paste in console
const text = 'नमस्ते, यह एक परीक्षण है';
const u = new SpeechSynthesisUtterance(text);
u.lang = 'hi-IN';
u.onstart = () => console.log('Started');
u.onend = () => console.log('Ended');
u.onerror = (e) => console.error('Error:', e);
window.speechSynthesis.speak(u);
```

If this works, the issue is in the integration.
If this doesn't work, the issue is with browser/device voice support.
