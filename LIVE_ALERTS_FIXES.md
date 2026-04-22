# Live Alerts, Active/Inactive Status, and Risk Zones Fixes

## Issues Identified

### 1. Active/Inactive Status Issue ❌
**Problem:** All users showing as "Inactive" even when actively using the app
**Root Cause:** The SQL query in `/api/users` endpoint was checking if location was updated within the last **30 seconds**, which is unrealistic for normal app usage.

```sql
-- OLD (Too strict - 30 seconds)
CASE 
  WHEN location_active = true 
    AND location_timestamp IS NOT NULL 
    AND (NOW() - location_timestamp) < INTERVAL '30 seconds' 
  THEN true
  ELSE false
END as location_active
```

**Fix Applied:** Changed threshold to **10 minutes** for realistic user activity tracking

```sql
-- NEW (Realistic - 10 minutes)
CASE 
  WHEN location_active = true 
    AND location_timestamp IS NOT NULL 
    AND (NOW() - location_timestamp) < INTERVAL '10 minutes' 
  THEN true
  ELSE false
END as location_active
```

**File Changed:** `server/index.js` (line ~820)

---

### 2. Live Alerts Display Issue ⚠️
**Problem:** Live Alerts section not showing clear incident information
**Root Cause:** The alerts are being fetched correctly from the API, but the display might be confusing due to:
- All incidents showing as "SOS : CRITICAL" without user details
- Need to ensure incidents have proper user names attached

**Current Status:** 
- ✅ Incidents API is working (`GET /api/incidents`)
- ✅ Authority Dashboard fetches incidents on load
- ✅ Socket.IO real-time updates are configured
- ⚠️ Need to verify user names are being joined properly in SQL query

**SQL Query Check:**
```sql
SELECT 
  i.id, i.user_id, i.type, i.description, i.severity, i.status, i.method,
  i.location_lat, i.location_lng, i.state, i.city, i.responses, i.demo,
  i.created_at, i.updated_at,
  u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
FROM incidents i 
LEFT JOIN users u ON i.user_id = u.id 
```

**Recommendation:** Check if incidents in database have valid `user_id` references

---

### 3. Risk Zones Not Displaying ❌
**Problem:** Risk Zones page is empty - no zones being displayed
**Root Cause:** Admin Dashboard is reading from `localStorage` instead of fetching from the API

**Current Code (WRONG):**
```javascript
// Admin Dashboard line ~202
const zones = JSON.parse(localStorage.getItem('riskZones') || '[]');
```

**Fix Needed:** Add API fetch for risk zones

```javascript
// Need to add this function in AdminDashboard.js
async function fetchRiskZones() {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${API_URL}/api/risk-zones`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      const zones = data.riskZones || [];
      localStorage.setItem('riskZones', JSON.stringify(zones));
      return zones;
    }
  } catch (error) {
    console.error('[AdminDashboard] Error fetching risk zones:', error);
    return [];
  }
}

// Call this on dashboard load
setTimeout(() => {
  fetchRiskZones();
  // ... other initialization
}, 0);
```

**API Endpoint:** `GET /api/risk-zones` (already exists in `server/index.js`)

---

## Summary of Changes Made

### ✅ Completed
1. **Active/Inactive Status Fix**
   - Changed threshold from 30 seconds to 10 minutes
   - File: `server/index.js`
   - Commit: `fc12bd7`

### 🔄 Pending (Recommendations)
2. **Risk Zones Display**
   - Need to add `fetchRiskZones()` function to Admin Dashboard
   - Replace localStorage read with API fetch
   - File to modify: `src/pages/AdminDashboard.js`

3. **Live Alerts Clarity**
   - Verify incidents have proper user_id references in database
   - Check if user names are being displayed correctly
   - May need to add demo incidents for testing

---

## Testing Checklist

### Active/Inactive Status
- [ ] Login as tourist
- [ ] Enable location tracking
- [ ] Wait 2-3 minutes without sending location
- [ ] Check Authority Dashboard - should still show "Active"
- [ ] Wait 11+ minutes - should show "Inactive"

### Live Alerts
- [ ] Create a test SOS incident
- [ ] Check Authority Dashboard "Live Alerts" section
- [ ] Verify incident shows: Type, Severity, Status, Tourist Name, Timestamp
- [ ] Verify real-time updates work (Socket.IO)

### Risk Zones
- [ ] Login as admin
- [ ] Navigate to "Risk Zones" tab
- [ ] Click "Generate Risk Zones" button (Demo Mode)
- [ ] Verify zones appear in the table
- [ ] Verify zones persist after page refresh

---

## Database Verification Queries

### Check if there are incidents with user data
```sql
SELECT 
  i.id, i.type, i.severity, i.status,
  u.name as user_name, u.email as user_email
FROM incidents i
LEFT JOIN users u ON i.user_id = u.id
ORDER BY i.created_at DESC
LIMIT 10;
```

### Check if there are risk zones
```sql
SELECT * FROM risk_zones ORDER BY created_at DESC;
```

### Check user location activity
```sql
SELECT 
  id, name, email, role,
  location_active,
  location_timestamp,
  NOW() - location_timestamp as time_since_update
FROM users
WHERE role = 'tourist'
ORDER BY location_timestamp DESC;
```

---

## Next Steps

1. ✅ **DONE:** Fix active/inactive status threshold
2. **TODO:** Add risk zones API fetch to Admin Dashboard
3. **TODO:** Verify incidents have proper user associations
4. **TODO:** Test all three features end-to-end
5. **TODO:** Add sample data if database is empty

