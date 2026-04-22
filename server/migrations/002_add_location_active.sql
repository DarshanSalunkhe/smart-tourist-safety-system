-- Migration 002: Add location_active column to users
-- Tracks whether a tourist is currently sharing their live location

ALTER TABLE users ADD COLUMN IF NOT EXISTS location_active BOOLEAN DEFAULT false;
