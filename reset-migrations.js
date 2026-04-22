require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function computeChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function resetMigrations() {
  console.log('🔧 Resetting migration checksums...\n');
  
  try {
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'server/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration files:\n`);
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const checksum = computeChecksum(content);
      
      // Update checksum in database
      const result = await pool.query(
        `UPDATE migrations SET checksum = $1 WHERE name = $2 RETURNING *`,
        [checksum, file]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ ${file}`);
        console.log(`   Old: ${result.rows[0].checksum}`);
        console.log(`   New: ${checksum}\n`);
      } else {
        console.log(`⚠️  ${file} - Not found in database (will be applied on next run)\n`);
      }
    }
    
    console.log('✅ Migration checksums reset successfully!');
    console.log('\nNow redeploy on Render (it will auto-deploy on git push)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetMigrations();
