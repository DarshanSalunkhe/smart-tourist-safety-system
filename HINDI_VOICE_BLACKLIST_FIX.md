# Hindi Voice Blacklist Fix

## Problem
- Marathi, Tamil, Telugu Online voices work fine
- Hindi Online voice specifically is BROKEN (times out)
- Need to blacklist the broken Hindi voice and use alternatives

## Solution: Voice Blacklist System

Added a blacklist of known broken voices that will be automatically skipped:

```javascript
const BROKEN_VOICES = [
  'Microsoft आरव Online (Natural)',  // Hindi - known to timeout
  'Microsoft Aarav Online (Natural)', // Hindi alternate name
];
```

## How It Works

### Voice Selection Flow for Hindi:

1. **Try LOCAL Hindi voice** (e.g., Microsoft Swara)
   - If found: ✅ Use it (best option)
   
2. **Try ONLINE Hindi voice** (e.g., Microsoft आरव)
   - Check blacklist first
   - If blacklisted: ❌ Skip it
   - If not blacklisted: ✅ Use it
   
3. **Fallback to Marathi voice** (since both use Devanagari script)
   - Hindi text can be read by Marathi voice
   - Better than no voice at all
   - Console shows: "Using Marathi voice for Hindi text"
   
4. **Last resort: English-India voice**
   - If no Marathi voice available

### For Other Languages (Marathi, Tamil, Telugu):
- Normal flow (no blacklist needed)
- Online voices work fine for these languages

## What Changed

### Before:
```javascript
// Would try broken Hindi voice → timeout → error
voice = voices.find(v => v.lang === 'hi-IN');
// Result: Microsoft आरव Online → TIMEOUT ❌
```

### After:
```javascript
// Filter out broken voices first
const workingVoices = voices.filter(v => !isVoiceBroken(v));
voice = workingVoices.find(v => v.lang === 'hi-IN');
// Result: Skips Microsoft आरव → Uses Marathi fallback ✅
```

## User Experience

### Hindi (Without Local Pack):
```
1. System checks for LOCAL Hindi voice → Not found
2. System checks for ONLINE Hindi voice → Found but BLACKLISTED
3. System uses Marathi voice as fallback → WORKS ✅
4. Console: "Using Marathi voice for Hindi text (Hindi voice is broken)"
```

### Hindi (With Local Pack):
```
1. System checks for LOCAL Hindi voice → Found (Microsoft Swara)
2. Uses LOCAL voice → WORKS PERFECTLY ✅
3. Console: "Using LOCAL voice: Microsoft Swara (hi-IN)"
```

### Other Languages:
```
No change - continue working as before
```

## Testing

1. **Refresh browser** with Ctrl+F5
2. **Switch to Hindi** language
3. **Open chatbot** and ask a question
4. **Expected behavior**:
   - Voice speaks in Marathi (sounds similar to Hindi)
   - Console shows: "Using Marathi voice for Hindi text"
   - No timeout errors

## Console Messages

| Message | Meaning |
|---------|---------|
| `Working voices (after blacklist): X` | Shows how many voices remain after filtering |
| `Using Marathi voice for Hindi text` | Hindi voice is broken, using Marathi fallback |
| `Using LOCAL voice: Microsoft Swara` | Perfect! Local Hindi pack installed |
| `Using ONLINE voice: Microsoft आरोही` | Marathi online voice (working) |

## Adding More Broken Voices

If you find other broken voices, add them to the blacklist:

```javascript
const BROKEN_VOICES = [
  'Microsoft आरव Online (Natural)',  // Hindi
  'Microsoft Aarav Online (Natural)', // Hindi alternate
  // Add more broken voices here:
  // 'Voice Name Here',
];
```

## Files Modified

1. `src/services/voice.js` - Added blacklist + fallback logic
2. `src/services/voiceService.js` - Added blacklist + fallback logic

## Why Marathi Works as Hindi Fallback

- Both Hindi and Marathi use **Devanagari script**
- Pronunciation is very similar
- Marathi voice can read Hindi text reasonably well
- Better than English voice (which can't read Devanagari at all)

## Permanent Solution

Install local Hindi language pack:
1. Settings → Time & Language → Language
2. Add "Hindi (India)"
3. Download "Text-to-speech" feature
4. Restart browser
5. System will automatically use local voice (not blacklisted)

## Summary

✅ Hindi voice now works (uses Marathi fallback)  
✅ No more timeout errors for Hindi  
✅ Other languages unaffected  
✅ Automatic upgrade when local pack installed  
✅ Easy to add more broken voices to blacklist
