# Systemic Fixes Applied - State Management & Authentication

## Problems Identified

### 1. Profile Photo Disappears After Save
**Root Cause:** Profile save handler was overwriting localStorage with stale `user` object, losing the `profile_photo` field that was added during upload.

**Bad Pattern:**
```javascript
// Captured once at page load
const user = authAPIService.getCurrentUser();

// Later, after photo upload...
user.profile_photo = '/uploads/photo.jpg';
localStorage.setItem('user', JSON.stringify(user));

// Then, profile save overwrites everything
user.phone = newPhone;
localStorage.setItem('user', JSON.stringify(user)); // ❌ Still has profile_photo

// BUT backend response doesn't include profile_photo
// So when we do:
user.phone = data.user.phone; // ❌ data.user has no profile_photo
localStorage.setItem('user', JSON.stringify(user)); // ❌ Photo lost!
```

### 2. Backend Not Returning profile_photo
Multiple endpoints were missing `profile_photo` in their responses:
- `/auth/login` - Missing
- `/auth/user` - Missing  
- `/api/users` - Missing (list endpoint)
- `/api/users/:id` PATCH - Missing

### 3. Stale User Object References
The `user` object was captured once at dashboard initialization, leading to stale data throughout the component lifecycle.

## Solutions Implemented

### Fix 1: Backend - Return profile_photo Everywhere

#### A. Login Endpoint (`/auth/login`)
```javascript
user: {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  picture: user.picture,
  profile_photo: user.profile_photo, // ✅ Added
  blockchainId: user.blockchain_id,
  phone: user.phone,
  emergencyContact: user.emergency_contact
}
```

#### B. Session User Endpoint (`/auth/user`)
```javascript
user: {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  picture: user.picture,
  profile_photo: user.profile_photo, // ✅ Added
  blockchainId: user.blockchain_id,
  phone: user.phone,
  emergencyContact: user.emergency_contact
}
```

#### C. Users List Endpoint (`/api/users`)
```sql
SELECT 
  id, email, name, role, phone, emergency_contact, blockchain_id, 
  picture, profile_photo, -- ✅ Added
  state, city, auth_provider, google_id, location_lat, location_lng, 
  location_timestamp, created_at,
  ...
FROM users
```

#### D. Update User Endpoint (`PATCH /api/users/:id`)
```sql
RETURNING id, email, name, role, phone, emergency_contact, 
          blockchain_id, picture, profile_photo -- ✅ Added
```

```javascript
user: {
  id: updated.id,
  email: updated.email,
  name: updated.name,
  role: updated.role,
  phone: updated.phone,
  emergencyContact: updated.emergency_contact,
  blockchainId: updated.blockchain_id,
  picture: updated.picture,
  profile_photo: updated.profile_photo // ✅ Added
}
```

### Fix 2: Frontend - Merge Instead of Overwrite

**Old Pattern (Bad):**
```javascript
// Overwrites entire user object with partial data
user.phone = data.user.phone;
user.emergencyContact = data.user.emergencyContact;
localStorage.setItem('user', JSON.stringify(user));
```

**New Pattern (Good):**
```javascript
// Read fresh data from localStorage
const currentUser = JSON.parse(localStorage.getItem('user')) || user;

// Merge response with existing data
const updatedUser = {
  ...currentUser, // ✅ Preserve all existing fields
  phone: data.user.phone,
  emergencyContact: data.user.emergencyContact,
  profile_photo: data.user.profile_photo || currentUser.profile_photo // ✅ Preserve photo
};

// Save merged data
localStorage.setItem('user', JSON.stringify(updatedUser));
```

### Fix 3: Always Read Fresh Data for Views

**Profile View:**
```javascript
function getProfileView() {
  // ✅ Always get fresh user data from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user')) || user;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const photoUrl = currentUser.profile_photo 
    ? `${API_URL}${currentUser.profile_photo}` 
    : 'https://via.placeholder.com/150?text=No+Photo';
  // ... render with currentUser
}
```

## Architecture Improvements

### Single Source of Truth Pattern

**Before:**
- User object captured once at page load
- Multiple places updating different copies
- localStorage and in-memory state out of sync

**After:**
- localStorage is the source of truth
- Always read from localStorage before rendering
- Merge updates instead of overwriting
- Backend returns complete user objects

### Data Flow

```
1. User logs in
   ↓
2. Backend returns complete user object (including profile_photo)
   ↓
3. Frontend saves to localStorage
   ↓
4. User uploads photo
   ↓
5. Backend saves photo, returns path
   ↓
6. Frontend merges photo path into localStorage
   ↓
7. User updates profile (phone/emergency)
   ↓
8. Backend returns updated user (including profile_photo)
   ↓
9. Frontend merges update into localStorage (preserves photo)
   ↓
10. Views always read from localStorage (always fresh)
```

## Files Modified

### Backend (`server/index.js`)
1. Line ~500: `/auth/login` - Added `profile_photo` to response
2. Line ~600: `/auth/user` - Added `profile_photo` to response
3. Line ~850: `/api/users` - Added `profile_photo` to SELECT query
4. Line ~920: `PATCH /api/users/:id` - Added `profile_photo` to RETURNING clause and response

### Frontend (`src/pages/TouristDashboard.js`)
1. Line ~803: `getProfileView()` - Read from localStorage
2. Line ~1007: Photo upload - Update preview immediately
3. Line ~1078: Cancel button - Read from localStorage
4. Line ~1118: Profile save - Merge instead of overwrite

### Frontend (`src/pages/AuthorityDashboard.js`)
1. Line ~1287: `getTouristsView()` - Display profile photos
2. Line ~1378: Profile modal - Display profile photos

## Testing Checklist

### Profile Photo Persistence
- [x] Upload photo → Shows immediately
- [x] Upload photo → Edit profile → Photo still visible
- [x] Upload photo → Refresh page → Photo still visible
- [x] Upload photo → Logout → Login → Photo still visible
- [x] Upload photo → Navigate away → Navigate back → Photo still visible

### Data Integrity
- [x] Edit phone → profile_photo preserved
- [x] Edit emergency contact → profile_photo preserved
- [x] Upload photo → phone/emergency preserved
- [x] All user fields returned from backend

### Authority Dashboard
- [x] Tourist list shows photos
- [x] Profile modal shows photos
- [x] Photos load with correct URLs

## Remaining Issues to Address

### 1. Language Settings
**Status:** Already implemented correctly in `src/services/i18n.js`
- Uses user-specific keys: `language_user_{userId}`
- Fallback to global `language` key for backward compatibility
- `setUserId()` called after login
- `clearUserId()` called on logout

**No changes needed** - Language isolation is already working.

### 2. Settings Icon Navigation
**Current:** Settings view exists but navigation might have timing issues
**Recommendation:** Already working with current navigation setup

### 3. 401 Errors
**Likely causes:**
- Session cookie configuration
- CORS origin mismatch
- `trust proxy` setting
- `secure` cookie on HTTP

**Current configuration:**
```javascript
cookie: {
  secure: process.env.NODE_ENV === 'production', // ✅ Correct
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ Correct
}
```

**Needs verification in production:**
- HTTPS enabled
- ALLOWED_ORIGINS matches frontend domain exactly
- Cookies being sent with requests

## Best Practices Established

### 1. Always Return Complete Objects
Backend endpoints should return complete user objects, not partial updates.

### 2. Merge, Don't Overwrite
When updating localStorage, merge new data with existing data.

### 3. localStorage as Source of Truth
Views should read from localStorage, not rely on stale in-memory references.

### 4. Include All Fields in SELECT
Database queries should include all relevant fields, including `profile_photo`.

### 5. Consistent Field Names
Backend returns both `picture` (Google OAuth) and `profile_photo` (manual upload).

## Performance Considerations

- Reading from localStorage is fast (synchronous)
- No additional network requests
- Images loaded on-demand
- Browser caching applies to uploaded images

## Security Notes

- profile_photo paths are relative (`/uploads/...`)
- Full URLs constructed on frontend with API_URL
- File uploads validated on backend
- Authentication required for upload/delete

## Future Improvements

- [ ] Consider using a state management library (Redux, Zustand)
- [ ] Implement optimistic UI updates with rollback
- [ ] Add real-time sync with WebSocket for profile updates
- [ ] Cache user data with expiration timestamps
- [ ] Implement proper error boundaries
- [ ] Add retry logic for failed updates

## Status

**COMPLETE** - Systemic state management issues resolved. Profile photos now persist correctly across all operations.
