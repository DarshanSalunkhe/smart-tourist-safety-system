# SafeTrip Voice Output Setup Guide

## Overview

SafeTrip AI now supports voice output in multiple Indian languages:
- 🇬🇧 English (en-US)
- 🇮🇳 Hindi (hi-IN)
- 🇮🇳 Marathi (mr-IN)
- 🇮🇳 Tamil (ta-IN)
- 🇮🇳 Telugu (te-IN)

## How It Works

1. **Backend**: The chatbot service (`server/services/chatbotService.js`) generates responses in the user's selected language using multilingual response files in `server/data/responses/`.

2. **Frontend**: The voice service (`src/services/voice.js`) uses the browser's Web Speech API to speak the response in the appropriate language.

3. **Language Selection**: The current language is stored in `localStorage` and managed by the i18n service (`src/services/i18n.js`).

## Testing Voice Output

### Quick Test
Visit `/voice-test.html` in your browser to:
- Test voice output in all supported languages
- See which voices are available on your device
- Check if Indian language voices are installed

### In the App
1. Open the SafeTrip app
2. Select a language from the language switcher
3. Open the chatbot widget (🤖 button)
4. Ask a question
5. The response should be spoken in your selected language

## Troubleshooting

### Issue: Voice only works in English

**Cause**: Your device doesn't have Indian language voice packs installed.

**Solutions**:

#### On Android:
1. Go to Settings → System → Languages & input → Text-to-speech output
2. Tap on "Preferred engine" (usually Google Text-to-speech)
3. Tap "Install voice data"
4. Download Hindi, Marathi, Tamil, or Telugu voice packs

#### On iOS/Safari:
1. Go to Settings → Accessibility → Spoken Content
2. Tap "Voices"
3. Download Indian language voices (Hindi, Tamil, etc.)

#### On Windows:
1. Go to Settings → Time & Language → Language
2. Add Hindi/Marathi/Tamil/Telugu
3. Click on the language → Options → Download speech pack

#### On macOS:
1. Go to System Preferences → Accessibility → Spoken Content
2. Click "System Voice" → Customize
3. Download Indian language voices

#### On Chrome OS:
1. Go to Settings → Advanced → Languages
2. Add Indian languages
3. Chrome will use Google's cloud TTS for these languages

### Issue: Voice sounds robotic or incorrect

**Cause**: The browser is using a fallback voice that doesn't match the language.

**Solution**: Install proper language packs (see above) or the system will use the default voice with incorrect pronunciation.

### Issue: No voice at all

**Possible causes**:
1. Browser doesn't support Web Speech API (very old browsers)
2. Microphone/speaker permissions denied
3. System volume is muted

**Solutions**:
1. Use a modern browser (Chrome, Edge, Safari, Firefox)
2. Check browser permissions for the site
3. Check system volume and unmute

## Browser Compatibility

| Browser | Voice Output | Indian Languages |
|---------|-------------|------------------|
| Chrome/Edge | ✅ Excellent | ✅ With language packs |
| Safari | ✅ Good | ✅ With iOS voices |
| Firefox | ✅ Good | ⚠️ Limited support |
| Mobile Chrome | ✅ Excellent | ✅ With Android TTS |
| Mobile Safari | ✅ Good | ✅ With iOS voices |

## Technical Details

### Voice Selection Logic

The voice service tries to find the best voice in this order:
1. Exact language match (e.g., `hi-IN`)
2. Language prefix match (e.g., `hi`)
3. Voice name contains language code
4. Falls back to default system voice

### Code References

- **Voice Service**: `src/services/voice.js` - Main voice handling
- **Voice Alert**: `src/services/voiceService.js` - Alert-specific voice
- **Chatbot Widget**: `src/components/ChatbotWidget.js` - Chatbot voice integration
- **Backend Responses**: `server/data/responses/*.json` - Multilingual text
- **Chatbot Service**: `server/services/chatbotService.js` - Response generation

## API Usage

### Speaking Text
```javascript
import { voiceService } from './services/voice.js';

// Speak in current selected language
voiceService.speak('Your text here', 'auto');

// Speak in specific language
voiceService.speak('नमस्ते', 'hi-IN');
```

### Alert Voice
```javascript
import { speakAlert } from './services/voiceService.js';

// Speak alert in current language
speakAlert('Emergency alert!');

// Speak in specific language
speakAlert('आपातकाल!', 'hi-IN');
```

## Future Enhancements

- [ ] Offline voice synthesis using local models
- [ ] Voice speed/pitch customization in settings
- [ ] Voice gender selection where available
- [ ] Fallback to cloud TTS when local voices unavailable
- [ ] Voice caching for common phrases

## Support

If voice output still doesn't work after following this guide:
1. Test at `/voice-test.html` to diagnose the issue
2. Check browser console for error messages
3. Verify language packs are installed on your device
4. Try a different browser
5. Report the issue with browser/OS details
