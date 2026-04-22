-- Migration 003: SMS audit log table
-- Tracks every SMS attempt, delivery status, and failure reason

CREATE TABLE IF NOT EXISTS sms_logs (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  incident_id VARCHAR(255) REFERENCES incidents(id) ON DELETE SET NULL,
  to_number   VARCHAR(50)  NOT NULL,
  message     TEXT         NOT NULL,
  provider    VARCHAR(50)  NOT NULL DEFAULT 'mock',
  status      VARCHAR(50)  NOT NULL DEFAULT 'queued',
  provider_id VARCHAR(255),
  error       TEXT,
  attempt     INTEGER      DEFAULT 1,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id     ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_incident_id ON sms_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status      ON sms_logs(status);
