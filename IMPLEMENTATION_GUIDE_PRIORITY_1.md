# Priority 1: Last Known Location Tracking & Auto-Alert

## Overview
Detect when tourists stop sending location updates and automatically alert authorities with their last known position.

## Technical Specification

### Database Changes

**Migration: `server/migrations/008_add_last_location_tracking.sql`**
```sql
-- Add last location tracking columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS last_known_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS location_inactive_alert_sent BOOLEAN DEFAULT false;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_last_location_update 
  ON users(last_location_update) 
  WHERE role = 'tourist' AND location_active = true;

-- Create alerts table for tracking inactive tourists
CREATE TABLE IF NOT EXISTS inactive_tourist_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  last_known_lat DECIMAL(10, 8),
  last_known_lng DECIMAL(11, 8),
  last_update_time TIMESTAMP,
  alert_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inactive_alerts_user 
  ON inactive_tourist_alerts(user_id, resolved);
```

### Backend Implementation

**File: `server/services/inactiveMonitor.js`** (NEW)
```javascript
const { pool } = require('../db');
const { socketService } = require('./socketService'); // If you have one

class InactiveMonitorService {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.inactiveThreshold = 30 * 60 * 1000; // Alert after 30 minutes
    this.intervalId = null;
  }

  start() {
    console.log('[InactiveMonitor] Starting inactive tourist monitoring...');
    this.intervalId = setInterval(() => {
      this.checkInactiveTourists();
    }, this.checkInterval);
    
    // Run immediately on start
    this.checkInactiveTourists();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('[InactiveMonitor] Stopped');
    }
  }

  async checkInactiveTourists() {
    try {
      const now = new Date();
      const thresholdTime = new Date(now - this.inactiveThreshold);

      // Find tourists who:
      // 1. Have location_active = true
      // 2. Haven't sent update in 30+ minutes
      // 3. Haven't been alerted yet
      const result = await pool.query(`
        SELECT 
          id, name, email, phone,
          last_known_lat, last_known_lng,
          last_location_update,
          EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 as minutes_inactive
        FROM users
        WHERE role = 'tourist'
          AND location_active = true
          AND last_location_update IS NOT NULL
          AND last_location_update < $1
          AND location_inactive_alert_sent = false
      `, [thresholdTime]);

      if (result.rows.length === 0) {
        console.log('[InactiveMonitor] All tourists are active');
        return;
      }

      console.log(`[InactiveMonitor] Found ${result.rows.length} inactive tourists`);

      for (const tourist of result.rows) {
        await this.sendInactiveAlert(tourist);
      }
    } catch (error) {
      console.error('[InactiveMonitor] Error checking inactive tourists:', error);
    }
  }

  async sendInactiveAlert(tourist) {
    try {
      // 1. Insert alert record
      await pool.query(`
        INSERT INTO inactive_tourist_alerts 
          (user_id, last_known_lat, last_known_lng, last_update_time)
        VALUES ($1, $2, $3, $4)
      `, [
        tourist.id,
        tourist.last_known_lat,
        tourist.last_known_lng,
        tourist.last_location_update
      ]);

      // 2. Mark user as alerted
      await pool.query(`
        UPDATE users 
        SET location_inactive_alert_sent = true
        WHERE id = $1
      `, [tourist.id]);

      // 3. Broadcast to all authorities via Socket.IO
      const alertData = {
        type: 'INACTIVE_TOURIST',
        userId: tourist.id,
        userName: tourist.name,
        userEmail: tourist.email,
        userPhone: tourist.phone,
        lastKnownLocation: {
          lat: parseFloat(tourist.last_known_lat),
          lng: parseFloat(tourist.last_known_lng)
        },
        lastUpdateTime: tourist.last_location_update,
        minutesInactive: Math.round(tourist.minutes_inactive),
        message: `Tourist ${tourist.name} has not sent location update in ${Math.round(tourist.minutes_inactive)} minutes`,
        timestamp: new Date().toISOString()
      };

      // Emit to Socket.IO (if io is available globally)
      if (global.io) {
        global.io.emit('tourist:inactive:alert', alertData);
        console.log(`[InactiveMonitor] Alert sent for tourist: ${tourist.name}`);
      }

      // 4. Optional: Send SMS to emergency contacts
      // await this.sendSMSAlert(tourist);

      return alertData;
    } catch (error) {
      console.error('[InactiveMonitor] Error sending alert:', error);
    }
  }

  async resolveAlert(userId) {
    try {
      // Mark alert as resolved
      await pool.query(`
        UPDATE inactive_tourist_alerts
        SET resolved = true, resolved_at = NOW()
        WHERE user_id = $1 AND resolved = false
      `, [userId]);

      // Reset alert flag on user
      await pool.query(`
        UPDATE users
        SET location_inactive_alert_sent = false
        WHERE id = $1
      `, [userId]);

      console.log(`[InactiveMonitor] Alert resolved for user: ${userId}`);
    } catch (error) {
      console.error('[InactiveMonitor] Error resolving alert:', error);
    }
  }
}

module.exports = new InactiveMonitorService();
```

**File: `server/index.js`** (MODIFY)
```javascript
// Add near the top with other requires
const inactiveMonitor = require('./services/inactiveMonitor');

// After Socket.IO setup, add:
// Make io globally available for inactive monitor
global.io = io;

// Start inactive monitoring after server starts
server.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  
  // Start inactive tourist monitoring
  inactiveMonitor.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  inactiveMonitor.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Modify existing location update handler to update last_location_update
socket.on('tourist:location:update', async (data, ack) => {
  // ... existing code ...
  
  // ADD THIS: Update last known location and timestamp
  await pool.query(`
    UPDATE users 
    SET 
      last_location_update = NOW(),
      last_known_lat = $1,
      last_known_lng = $2,
      location_inactive_alert_sent = false
    WHERE id = $3
  `, [data.location.lat, data.location.lng, data.userId]);
  
  // If user was previously inactive, resolve the alert
  inactiveMonitor.resolveAlert(data.userId);
  
  // ... rest of existing code ...
});
```

### Frontend Implementation

**File: `src/pages/AuthorityDashboard.js`** (MODIFY)
```javascript
// Add to listenForSocketUpdates function
function listenForSocketUpdates() {
  // ... existing listeners ...
  
  // NEW: Listen for inactive tourist alerts
  window.addEventListener('socketInactiveTouristAlert', (e) => {
    const alert = e.detail;
    console.log('[AuthorityDashboard] Inactive tourist alert:', alert);
    
    // Show prominent notification
    showInactiveAlert(alert);
    
    // Add to alerts list
    addAlertToList(alert);
    
    // Update map with last known location
    if (window.map && alert.lastKnownLocation) {
      addInactiveMarkerToMap(alert);
    }
  });
}

function showInactiveAlert(alert) {
  // Create prominent alert banner
  const banner = document.createElement('div');
  banner.className = 'inactive-tourist-banner';
  banner.innerHTML = `
    <div class="alert-content">
      <div class="alert-icon">⚠️</div>
      <div class="alert-details">
        <strong>INACTIVE TOURIST DETECTED</strong>
        <p>${alert.userName} - No location update for ${alert.minutesInactive} minutes</p>
        <p>Last known: ${alert.lastKnownLocation.lat.toFixed(4)}, ${alert.lastKnownLocation.lng.toFixed(4)}</p>
      </div>
      <button onclick="viewInactiveTourist(${alert.userId})" class="btn btn-warning btn-sm">
        View Location
      </button>
    </div>
  `;
  
  // Add to top of page
  const mainContent = document.querySelector('.main-content');
  mainContent.insertBefore(banner, mainContent.firstChild);
  
  // Auto-remove after 2 minutes
  setTimeout(() => banner.remove(), 2 * 60 * 1000);
}

function addInactiveMarkerToMap(alert) {
  if (!window.map) return;
  
  const marker = L.marker(
    [alert.lastKnownLocation.lat, alert.lastKnownLocation.lng],
    {
      icon: L.divIcon({
        className: 'inactive-tourist-marker',
        html: '<div class="marker-icon">⚠️</div>',
        iconSize: [40, 40]
      })
    }
  ).addTo(window.map);
  
  marker.bindPopup(`
    <div class="map-popup">
      <h4>⚠️ Inactive Tourist</h4>
      <p><strong>${alert.userName}</strong></p>
      <p>Last update: ${new Date(alert.lastUpdateTime).toLocaleString()}</p>
      <p>Inactive for: ${alert.minutesInactive} minutes</p>
      <button onclick="contactTourist(${alert.userId})" class="btn btn-primary btn-sm">
        Contact
      </button>
    </div>
  `);
  
  // Pan to location
  window.map.setView([alert.lastKnownLocation.lat, alert.lastKnownLocation.lng], 14);
}
```

**File: `src/services/socket.js`** (MODIFY)
```javascript
// Add to existing socket event listeners
socket.on('tourist:inactive:alert', (data) => {
  console.log('[Socket] Inactive tourist alert:', data);
  window.dispatchEvent(new CustomEvent('socketInactiveTouristAlert', { detail: data }));
});
```

### CSS Styling

**File: `src/styles/main.css`** (ADD)
```css
/* Inactive Tourist Alert Banner */
.inactive-tourist-banner {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 1.25rem;
  border-radius: var(--r-lg);
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
  animation: alertPulse 2s ease-in-out infinite;
}

@keyframes alertPulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(245, 158, 11, 0.6);
  }
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.alert-icon {
  font-size: 2rem;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.alert-details {
  flex: 1;
}

.alert-details strong {
  display: block;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.alert-details p {
  margin: 0.15rem 0;
  font-size: 0.9rem;
  opacity: 0.95;
}

/* Inactive Tourist Map Marker */
.inactive-tourist-marker {
  background: #f59e0b;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
  animation: markerPulse 2s ease-in-out infinite;
}

@keyframes markerPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.7);
  }
}

.marker-icon {
  font-size: 1.5rem;
  text-align: center;
  line-height: 40px;
}
```

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Background monitor starts on server boot
- [ ] Location updates reset the inactive timer
- [ ] Alert triggers after 30 minutes of inactivity
- [ ] Authorities receive Socket.IO notification
- [ ] Map shows last known location
- [ ] Alert resolves when tourist becomes active again
- [ ] Multiple inactive tourists handled correctly
- [ ] Server restart doesn't lose monitoring state

## Configuration Options

Add to `.env`:
```env
# Inactive Tourist Monitoring
INACTIVE_CHECK_INTERVAL=300000  # 5 minutes in ms
INACTIVE_THRESHOLD=1800000      # 30 minutes in ms
```

## Next Steps After Implementation

1. Add SMS notifications to emergency contacts
2. Add email alerts to authorities
3. Create admin dashboard to view all inactive alerts
4. Add manual "I'm safe" check-in button for tourists
5. Implement escalation (alert after 30min, escalate after 60min)
