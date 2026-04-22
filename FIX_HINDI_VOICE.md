# Fix Hindi Voice Issue

Good news: Marathi, Tamil, and Telugu are working! 
Issue: Hindi is not working.

## Quick Diagnosis

Open this page to see what's wrong with Hindi:

```
http://localhost:5000/hindi-debug.html
```

This will:
1. Search for all Hindi voices on your system
2. Test different language codes (hi-IN, hi, en-IN)
3. Let you test each available voice

## Most Likely Causes

### Cause 1: No Hindi Voice Pack Installed

**Check:** The debug page shows "NO HINDI VOICES FOUND"

**Solution:** Install Hindi language pack on your device

**Windows:**
1. Settings → Time & Language → Language
2. Click "Add a language"
3. Search for "Hindi" and add it
4. Click on Hindi → Options
5. Download "Speech" pack
6. Restart browser

**Android:**
1. Settings → System → Languages & input
2. Text-to-speech output
3. Google Text-to-speech Engine → Settings
4. Install voice data
5. Download "Hindi" voice

**Mac:**
1. System Preferences → Accessibility
2. Spoken Content → System Voice
3. Click "Customize"
4. Download "Lekha" or other Hindi voice

**iOS:**
1. Settings → Accessibility
2. Spoken Content → Voices
3. Download Hindi voice

### Cause 2: Hindi Voice Exists But Wrong Language Code

**Check:** Debug page shows Hindi voice but with different language code

**Solution:** The code now has enhanced fallback that will try:
- `hi-IN` (standard)
- `hi` (short code)
- Any voice with "hindi" in name
- Any voice with "हिन्दी" in name
- `en-IN` (Indian English as last resort)

### Cause 3: Browser Issue

**Check:** Other languages work but Hindi consistently fails

**Solution:** Try a different browser
- Chrome/Edge: Best support
- Firefox: Sometimes has issues with Indian languages
- Safari: Good on Mac/iOS

## After Installing Hindi Voice Pack

1. **Restart your browser completely** (close all windows)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Test again:**
   ```
   http://localhost:5000/hindi-debug.html
   ```
4. Should now show "FOUND 1 HINDI VOICE" or more

## Test in the App

Once Hindi voice is found:

1. Open app: `http://localhost:5000`
2. Select Hindi (हिन्दी) from language switcher
3. Open chatbot (🤖 button)
4. Ask: "Risk score?"
5. Should now speak in Hindi!

## Console Debugging

Open browser console (F12) and check for:

```
[Voice] Speaking in hi-IN, text: "नमस्ते..."
[Voice] Total voices available: 67
[Voice] ✅ Using voice: Google हिन्दी (hi-IN)
[Voice] 🔊 Started speaking in hi-IN
[Voice] ✅ Finished speaking
```

If you see:
```
[Voice] ⚠️ No voice found for hi-IN
```

Then Hindi voice pack is not installed.

## Temporary Workaround

If you can't install Hindi voice pack right now, the code will:
1. Try to find any Hindi voice
2. Fall back to Indian English voice
3. Fall back to default system voice

The text will still be in Hindi, just the pronunciation might not be perfect.

## Verify Installation

After installing Hindi voice pack, run this in browser console:

```javascript
const voices = window.speechSynthesis.getVoices();
const hindiVoices = voices.filter(v => v.lang.includes('hi'));
console.log('Hindi voices:', hindiVoices);
```

Should show at least one Hindi voice.

## Still Not Working?

1. **Check the debug page** - it will tell you exactly what's available
2. **Try different browsers** - Chrome usually has best support
3. **Check OS language settings** - Make sure Hindi is added as a language
4. **Restart device** - Sometimes voice packs need a restart to activate
5. **Check browser console** - Look for specific error messages

## Expected Output (When Working)

Debug page should show:
```
✅ FOUND 1 HINDI VOICE(S):

1. Google हिन्दी
   Language: hi-IN
   Local: Yes
   Default: No
```

Then clicking "Test with hi-IN" should speak Hindi correctly.

## Why Other Languages Work But Not Hindi?

Different reasons:
- Hindi voice pack not installed (most common)
- Hindi voice corrupted during installation
- Browser cache issue with Hindi voice
- OS language settings incomplete for Hindi

The debug page will tell you which one it is!
