# Restart Server and Test Voice

## Step 1: Restart the Server

Stop your current server (Ctrl+C) and restart:

```bash
npm run dev
```

## Step 2: Open the Diagnostic Tool

Once the server is running, open:

```
http://localhost:5000/voice-diagnostic.html
```

This will show you:
- ✅ If voice API is working
- ✅ How many voices are available  
- ✅ If Indian language voices are installed
- ✅ Test each language with one click

## Step 3: Test Each Language

Click the language buttons:
- 🇬🇧 English
- 🇮🇳 Hindi
- 🇮🇳 Marathi
- 🇮🇳 Tamil
- 🇮🇳 Telugu

## Step 4: Check Results

The diagnostic tool will tell you:
- ✅ Voice found = Good! Voice will sound correct
- ⚠️ No voice found = Need to install language packs

## If No Indian Language Voices Found

You need to install language packs on your device:

### Android:
1. Settings → System → Languages & input
2. Text-to-speech output → Google Text-to-speech Engine
3. Install voice data → Download Hindi, Marathi, Tamil, Telugu

### Windows:
1. Settings → Time & Language → Language
2. Add Hindi/Marathi/Tamil/Telugu
3. Click language → Options → Download "Speech" pack

### iOS:
1. Settings → Accessibility → Spoken Content
2. Voices → Download Indian language voices

### Mac:
1. System Preferences → Accessibility
2. Spoken Content → System Voice → Customize
3. Download Indian language voices

## Alternative Test Pages

If you want simpler tests:

```
http://localhost:5000/quick-voice-test.html
http://localhost:5000/voice-test.html
```

## Test in the Actual App

After diagnostic shows voices are working:

1. Open: `http://localhost:5000`
2. Select Hindi (हिन्दी) from language switcher
3. Open chatbot (🤖 button)
4. Ask: "Risk score?"
5. Should speak in Hindi (if voice pack installed)

## Check Browser Console

Press F12 and look for these logs:

```
[Voice] Speaking in hi-IN, text: "नमस्ते..."
[Voice] Using voice: Google हिन्दी (hi-IN)
[Voice] Started speaking in hi-IN
[Voice] Finished speaking
```

## Common Issues

### "Cannot GET /voice-diagnostic.html"
- Server not restarted after adding static file serving
- Solution: Restart server with `npm run dev`

### "No voices loaded"
- Voices loading asynchronously
- Solution: Wait a few seconds, click "Refresh Voice List"

### "No voice found for hi-IN"
- Language packs not installed
- Solution: Install language packs (see above)

### Voice speaks but sounds wrong
- Using default voice, not Hindi voice
- Solution: Install Hindi language pack

## Success Indicators

✅ Diagnostic tool shows 50+ voices loaded
✅ Hindi/Marathi/Tamil/Telugu show as "Available"
✅ Test buttons speak in correct language
✅ App chatbot speaks responses in selected language

That's it! The diagnostic tool will tell you exactly what's working and what needs to be fixed.
