const { pool } = require('../db');

class InactiveMonitorService {
  constructor() {
    this.checkInterval = parseInt(process.env.INACTIVE_CHECK_INTERVAL) || 5 * 60 * 1000; // 5 minutes
    this.inactiveThreshold = parseInt(process.env.INACTIVE_THRESHOLD) || 30 * 60 * 1000; // 30 minutes
    this.intervalId = null;
  }

  start() {
    console.log('[InactiveMonitor] Starting inactive tourist monitoring...');
    console.log(`[InactiveMonitor] Check interval: ${this.checkInterval / 1000}s, Threshold: ${this.inactiveThreshold / 60000}min`);
    
    this.intervalId = setInterval(() => {
      this.checkInactiveTourists();
    }, this.checkInterval);
    
    // Run immediately on start
    setTimeout(() => this.checkInactiveTourists(), 5000);
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
        return;
      }

      console.log(`[InactiveMonitor] ⚠️  Found ${result.rows.length} inactive tourists`);

      for (const tourist of result.rows) {
        await this.sendInactiveAlert(tourist);
      }
    } catch (error) {
      console.error('[InactiveMonitor] Error checking inactive tourists:', error);
    }
  }

  async sendInactiveAlert(tourist) {
    try {
      // Insert alert record
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

      // Mark user as alerted
      await pool.query(`
        UPDATE users 
        SET location_inactive_alert_sent = true
        WHERE id = $1
      `, [tourist.id]);

      // Broadcast to all authorities via Socket.IO
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

      if (global.io) {
        global.io.emit('tourist:inactive:alert', alertData);
        console.log(`[InactiveMonitor] 🚨 Alert sent for tourist: ${tourist.name} (${Math.round(tourist.minutes_inactive)}min inactive)`);
      }

      return alertData;
    } catch (error) {
      console.error('[InactiveMonitor] Error sending alert:', error);
    }
  }

  async resolveAlert(userId) {
    try {
      await pool.query(`
        UPDATE inactive_tourist_alerts
        SET resolved = true, resolved_at = NOW()
        WHERE user_id = $1 AND resolved = false
      `, [userId]);

      await pool.query(`
        UPDATE users
        SET location_inactive_alert_sent = false
        WHERE id = $1
      `, [userId]);

      console.log(`[InactiveMonitor] ✅ Alert resolved for user: ${userId}`);
    } catch (error) {
      console.error('[InactiveMonitor] Error resolving alert:', error);
    }
  }
}

module.exports = new InactiveMonitorService();
