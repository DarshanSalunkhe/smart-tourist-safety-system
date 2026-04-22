# 🧪 Testing SOS & SMS Fallback Buttons

## Current Status
✅ Backend server running on port 5000
✅ Twilio SMS service working (test successful)
✅ API endpoint working (POST /api/incidents)
✅ Phone normalization fixed (+91 prefix added)
❓ Frontend buttons need testing

## What I Added
Added detailed console logging to both buttons to help debug:
- SOS Button: Logs every step from click to API response
- SMS Fallback Button: Logs location, user data, and API calls

## Testing Steps

### 1. Refresh Your Browser
Since we updated the code, you need to refresh:
- Press `Ctrl + Shift + R` (hard refresh)
- Or clear cache and reload

### 2. Open Developer Console
- Press `F12` on your keyboard
- Or right-click → Inspect → Console tab

### 3. Test SOS Button
1. Click the red **SOS** button (bottom right corner)
2. Watch the console for these messages:

**Expected Console Output:**
```
[TouristDashboard] 🚨 SOS button clicked!
[TouristDashboard] SOS confirmed by user
[TouristDashboard] Location: {lat: 17.xxxx, lng: 78.xxxx}
[TouristDashboard] User ID: google-1775721763894
[TouristDashboard] Sending SOS to backend...
[TouristDashboard] Incident data: {...}
[TouristDashboard] ✅ SOS sent successfully: {...}
```

**If you see errors:**
```
❌ Location unavailable → Enable GPS/location services
❌ Failed to send SOS → Check error message
❌ Network error → Backend not running
```

### 4. Test SMS Fallback Button
1. Click the **SMS Fallback** button (top section)
2. Watch the console for these messages:

**Expected Console Output:**
```
[TouristDashboard] 📱 SMS Fallback button clicked!
[TouristDashboard] Location: {lat: 17.xxxx, lng: 78.xxxx}
[TouristDashboard] Risk score: 75
[TouristDashboard] SMS confirmed, sending to backend...
[TouristDashboard] Incident data: {...}
[TouristDashboard] ✅ Emergency SMS sent successfully!
```

### 5. Check Backend Logs
In your terminal where backend is running, you should see:
```
[Incidents] Creating incident
[SMS] Twilio sent to +919912955971: SMxxxx (queued)
[SMS] SOS alert: 1 sent, 1 failed out of 2 targets
```

### 6. Check Your Phone
- SMS should arrive at: **+919912955971**
- Emergency contact: **+917893135999** (needs Twilio verification)

## Common Issues & Solutions

### Issue 1: "SOS button not found"
**Console shows:** `[TouristDashboard] SOS button not found`
**Solution:** 
- Button ID might be wrong
- Check if you're on the correct page (Tourist Dashboard)
- Refresh the page

### Issue 2: "Location unavailable"
**Console shows:** `[TouristDashboard] Location unavailable`
**Solution:**
- Enable location services in browser
- Allow location permission for the site
- Check if GPS is working

### Issue 3: "Network error"
**Console shows:** `Failed to fetch` or `Network error`
**Solution:**
- Backend server not running → Run `npm run server`
- Wrong API URL → Check `.env` file has `VITE_API_URL=http://localhost:5000`
- CORS issue → Check backend CORS settings

### Issue 4: "User not logged in"
**Console shows:** `user.id is undefined`
**Solution:**
- Log out and log back in
- Clear localStorage and login again
- Check if session is valid

### Issue 5: SMS not received
**Backend shows:** `[SMS] Twilio sent to +919912955971: SMxxxx (queued)`
**But no SMS received**
**Solution:**
- Check Twilio message status: `node check-twilio-message.js`
- Verify phone number in Twilio console
- Check for error code 30044 (number blocked)
- Wait a few minutes (SMS can be delayed)

## Quick Test Commands

### Test Twilio directly:
```bash
node test-twilio.js +919912955971
```

### Test API endpoint:
```bash
node test-incident-api.js
```

### Test full SOS flow:
```bash
node test-sos-darshan.js
```

### Check message status:
```bash
node check-twilio-message.js
```

## What to Share

If buttons still don't work, share:
1. **Console output** (copy from F12 console)
2. **Backend logs** (from terminal where server is running)
3. **Any error messages** (red text in console)
4. **Screenshot** of the dashboard

## Expected Result

When everything works:
1. ✅ Click SOS button
2. ✅ Confirm dialog appears
3. ✅ Console shows success messages
4. ✅ Backend logs show SMS sent
5. ✅ SMS arrives on your phone (+919912955971)
6. ✅ Success notification appears on screen

## Notes

- **Trial Account Limitation**: Emergency contact (+917893135999) needs verification in Twilio
- **First SMS worked**: The test SMS was delivered successfully
- **Recent SMS failed**: Error 30044 (number blocked) - might need re-verification
- **Backend works**: API endpoint tested and working
- **Frontend updated**: Debug logging added to both buttons

---

**Next Step**: Refresh browser, open console (F12), click buttons, and share console output!
