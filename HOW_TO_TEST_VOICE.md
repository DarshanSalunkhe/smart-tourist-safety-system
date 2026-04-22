# How to Test Voice Output - Step by Step

## Quick Start

1. **Start your server:**
   ```bash
   npm run dev
   ```

2. **Open the diagnostic tool:**
   ```
   http://localhost:5000/voice-diagnostic.html
   ```

3. **Run all checks** - this will tell you exactly what's working and what's not

## What to Check

### Step 1: System Check
- Click "Run System Check" button
- Should show: ✅ speechSynthesis API: Available
- Should show: ✅ Voices loaded: [some number]
- If you see ❌ or 0 voices, your browser doesn't support voice or voices haven't loaded

### Step 2: Test Each Language
- Click each language button (English, Hindi, Marathi, Tamil, Telugu)
- Listen to the voice output
- Check the output log:
  - ✅ Voice found = Good! Voice will sound correct
  - ⚠️ No voice found = Will speak but may sound wrong

### Step 3: Check Indian Language Support
- Look at the table showing Hindi, Marathi, Tamil, Telugu
- ✅ Available = You have the voice pack installed
- ❌ Not Found = You need to install language packs

### Step 4: Check App Configuration
- Click "Check Configuration"
- Shows what language is currently selected
- Shows if a voice is available for that language

## If Voice Doesn't Work

### Problem 1: "No voices loaded" or "0 voices"

**Solution:**
- Wait a few seconds and click "Refresh Voice List"
- Voices load asynchronously in some browsers
- If still 0, try a different browser (Chrome works best)

### Problem 2: "No voice found for hi-IN" (or other Indian language)

**Solution - You need to install language packs:**

**On Android:**
1. Settings → System → Languages & input
2. Text-to-speech output
3. Tap on "Google Text-to-speech Engine"
4. Tap "Install voice data"
5. Download Hindi, Marathi, Tamil, Telugu

**On iPhone/iPad:**
1. Settings → Accessibility
2. Spoken Content → Voices
3. Download Indian language voices

**On Windows:**
1. Settings → Time & Language → Language
2. Add Hindi/Marathi/Tamil/Telugu
3. Click on language → Options
4. Download "Speech" pack

**On Mac:**
1. System Preferences → Accessibility
2. Spoken Content → System Voice → Customize
3. Download Indian language voices

### Problem 3: Voice speaks but in wrong accent/language

**Cause:** No proper voice pack installed, using default voice

**Solution:** Install language packs (see above)

### Problem 4: No sound at all

**Check:**
1. System volume not muted
2. Browser has audio permission
3. Try the simple test in browser console:
   ```javascript
   const u = new SpeechSynthesisUtterance('test');
   window.speechSynthesis.speak(u);
   ```

## Testing in the Actual App

After diagnostic tool shows everything is working:

1. **Open the app:** `http://localhost:5000`

2. **Select a language:**
   - Click the language switcher (top right)
   - Select "हिन्दी" (Hindi)

3. **Open chatbot:**
   - Click the 🤖 button (bottom right)

4. **Ask a question:**
   - Type: "Risk score?"
   - Press Enter

5. **Check the response:**
   - Text should be in Hindi
   - Voice should speak in Hindi (if voice pack installed)

6. **Check browser console (F12):**
   - Should see: `[Voice] Speaking in hi-IN`
   - Should see: `[Voice] Using voice: [voice name]`
   - Should see: `[Voice] Started speaking in hi-IN`

## Console Debugging

Open browser console (F12) and run these commands:

### Check current language:
```javascript
console.log('Language:', localStorage.getItem('language'));
```

### Check available voices:
```javascript
const voices = window.speechSynthesis.getVoices();
console.log('Total voices:', voices.length);
console.log('Hindi voices:', voices.filter(v => v.lang.includes('hi')));
```

### Test voice directly:
```javascript
const text = 'नमस्ते, यह एक परीक्षण है';
const u = new SpeechSynthesisUtterance(text);
u.lang = 'hi-IN';
u.onstart = () => console.log('Started');
u.onend = () => console.log('Ended');
u.onerror = (e) => console.error('Error:', e);
window.speechSynthesis.speak(u);
```

### Force Hindi language:
```javascript
localStorage.setItem('language', 'hi');
location.reload();
```

## Expected Console Output (When Working)

When you ask the chatbot a question in Hindi, you should see:

```
[Chatbot] Response received: नमस्ते! मैं आपका SafeTrip AI सुरक्षा सहायक हूं...
[Chatbot] Response language detected: Hindi/Marathi
[Chatbot] Current language setting: hi
[Chatbot] Speaker enabled, calling voice service...
[Voice] Speaking in hi-IN, text: "नमस्ते! मैं आपका SafeTrip AI..."
[Voice] Current localStorage language: hi
[Voice] Total voices available: 67
[Voice] ✅ Using voice: Google हिन्दी (hi-IN)
[Voice] 🔊 Started speaking in hi-IN
[Voice] ✅ Finished speaking
```

## Still Not Working?

1. **Check the diagnostic tool first** - it will tell you exactly what's wrong

2. **Try the quick test page:**
   ```
   http://localhost:5000/quick-voice-test.html
   ```

3. **Check browser compatibility:**
   - Chrome/Edge: Best support ✅
   - Safari: Good support ✅
   - Firefox: Limited support ⚠️

4. **Try a different device** - some devices don't have Indian language voices

5. **Check the DEBUG_VOICE.md file** for more detailed debugging steps

## Success Checklist

- [ ] Diagnostic tool shows voices loaded
- [ ] Diagnostic tool can speak in English
- [ ] Indian language voices show as "Available"
- [ ] Diagnostic tool can speak in Hindi/other languages
- [ ] App language switcher works
- [ ] Chatbot shows Hindi text when Hindi is selected
- [ ] Chatbot speaks Hindi text in Hindi voice
- [ ] Console shows correct language codes

If all checkboxes are ✅, voice is working correctly!

## Quick Reference

| File | Purpose |
|------|---------|
| `/voice-diagnostic.html` | Complete diagnostic tool (USE THIS FIRST) |
| `/quick-voice-test.html` | Simple voice test |
| `/voice-test.html` | Original voice test |
| `DEBUG_VOICE.md` | Detailed debugging guide |
| `VOICE_SETUP.md` | User setup instructions |

## Need Help?

1. Run `/voice-diagnostic.html`
2. Take a screenshot of the results
3. Check browser console for errors
4. Note your browser and OS version
5. Report the issue with these details
