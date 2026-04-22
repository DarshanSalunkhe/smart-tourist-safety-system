-- Add profile photo column to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_profile_photo 
  ON users(id) 
  WHERE profile_photo IS NOT NULL;
