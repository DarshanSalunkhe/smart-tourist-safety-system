-- Add last location tracking columns for inactive tourist detection
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_known_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS last_known_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS location_inactive_alert_sent BOOLEAN DEFAULT false;

-- Create index for efficient querying of inactive tourists
CREATE INDEX IF NOT EXISTS idx_users_last_location_update 
  ON users(last_location_update) 
  WHERE role = 'tourist' AND location_active = true;

-- Create alerts table for tracking inactive tourists
CREATE TABLE IF NOT EXISTS inactive_tourist_alerts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
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
