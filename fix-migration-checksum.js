// Quick fix for migration checksum mismatch
// Run this with: node fix-migration-checksum.js

require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

async function fixAllChecksums() {
  try {
    console.log('🔧 Fixing all migration checksums...\n');
    
    const migrationsDir = path.join(__dirname, 'server', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    let fixed = 0;
    
    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      const newChecksum = sha256(sql);
      
      console.log(`📄 ${file}`);
      console.log(`   Checksum: ${newChecksum}`);
      
      // Update the checksum in the database
      const result = await pool.query(
        'UPDATE schema_migrations SET checksum = $1 WHERE version = $2',
        [newChecksum, file]
      );
      
      if (result.rowCount > 0) {
        console.log('   ✅ Updated\n');
        fixed++;
      } else {
        console.log('   ⚠️  Not in database (not applied yet)\n');
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} migration(s)!`);
    console.log('You can now run: npm run dev');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAllChecksums();
