# Test Hindi Backend - Quick Guide

## The Issue

You said: "Hindi language is now working only English words are being read"

This means:
- ✅ Voice is working
- ❌ But the TEXT is in English, not Hindi
- So the voice reads English words (correctly)

## Root Cause

The backend is returning English responses instead of Hindi responses when language is set to 'hi'.

## Test It

### Step 1: Test Backend Directly

Open this page:
```
http://localhost:5000/test-hindi-backend.html
```

Click: **"Test 'Risk score?' in Hindi"**

### Step 2: Check the Result

You should see:
```
✅ Response received!

=== RESPONSE TEXT ===
आपका सुरक्षा जोखिम स्कोर 50 है — Medium। सतर्क रहें...

=== ANALYSIS ===
Language requested: hi
Contains Hindi/Marathi: ✅ YES
✅ SUCCESS: Backend returned Hindi response!
```

### Step 3: If You See English Instead

If you see:
```
Your safety risk score is 50 - Medium. Stay alert...

⚠️ WARNING: Requested Hindi but response is in English!
```

Then the backend is NOT using the Hindi response file.

## Check Server Logs

After testing, check your server terminal. You should see:
```
[Chatbot API] Received request:
  - Message: Risk score?
  - Language: hi
  - Risk Data: { score: 50, level: 'Medium' }
[Chatbot API] Generated response: आपका सुरक्षा जोखिम स्कोर...
[Chatbot API] Response contains Hindi: true
```

If you see `Language: en` instead of `Language: hi`, then the language is not being passed correctly.

## Possible Issues

### Issue 1: Language Not Being Passed
- Frontend sends 'hi'
- Backend receives 'en' or undefined
- Backend defaults to English

**Fix:** Check network tab in browser (F12 → Network)
- Find POST request to `/api/chatbot`
- Check Request Payload
- Should include: `"lang": "hi"`

### Issue 2: Backend Not Using Language Parameter
- Backend receives 'hi'
- But still returns English
- chatbotService.js not using the lang parameter

**Fix:** Check server logs for the language value

### Issue 3: Hindi Response File Not Loaded
- Backend tries to use Hindi
- But hi.json file not loaded properly
- Falls back to English

**Fix:** Check if `server/data/responses/hi.json` exists

## Quick Debug Commands

### In Browser Console (F12):
```javascript
// Check current language
console.log('Current language:', localStorage.getItem('language'));

// Check i18n service
import('./src/services/i18n.js').then(({ i18n }) => {
  console.log('i18n current language:', i18n.currentLang);
});
```

### In Server Terminal:
Look for these logs when you ask a question:
```
[Chatbot API] Received request:
  - Language: hi  <-- Should be 'hi' not 'en'
```

## Expected Flow

1. User selects Hindi (हिन्दी) in app
2. `localStorage.setItem('language', 'hi')`
3. User asks chatbot: "Risk score?"
4. Frontend: `chatService.askChatbot()` with `i18n.currentLang = 'hi'`
5. API call: `POST /api/chatbot` with `{ lang: 'hi' }`
6. Backend: `generateSafetyReply(message, riskData, 'hi')`
7. Backend: Loads `server/data/responses/hi.json`
8. Backend: Returns Hindi text
9. Frontend: Displays Hindi text
10. Voice: Speaks Hindi text (with Hindi or fallback voice)

## Test Each Step

### Test 1: Frontend Language Setting
```javascript
// In browser console
localStorage.getItem('language')  // Should return 'hi'
```

### Test 2: API Request
```
http://localhost:5000/test-hindi-backend.html
```
Click "Test 'Risk score?' in Hindi"

### Test 3: Server Logs
Check terminal for:
```
[Chatbot API] Language: hi
[Chatbot API] Response contains Hindi: true
```

### Test 4: In App
1. Open app
2. Select Hindi
3. Open chatbot
4. Ask question
5. Check browser console for logs

## If Backend Returns English

The issue is in one of these files:
1. `src/services/chatService.js` - Not passing language
2. `src/services/apiClient.js` - Not sending language in request
3. `server/routes/chatbot.js` - Not receiving language
4. `server/services/chatbotService.js` - Not using language

The debug logs I added will show exactly where it breaks.

## Next Steps

1. Open `http://localhost:5000/test-hindi-backend.html`
2. Test "Risk score?" in Hindi
3. Check if response is in Hindi or English
4. Check server terminal logs
5. Report what you see

This will tell us exactly where the issue is!
