require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
console.log('🔗 Connecting to:', maskedUrl);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

async function testConnection(retries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully at:', result.rows[0].now);
      return true;
    } catch (error) {
      console.warn(`⚠️  DB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`   Retrying in ${delayMs / 1000}s…`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  console.error('❌ Database connection test failed after all retries');
  return false;
}

// ── Migration runner ───────────────────────────────────────────────────────
// Reads numbered SQL files from server/migrations/, tracks applied ones in
// schema_migrations table, and runs only new ones in order on every boot.
// Uses a PostgreSQL advisory lock to prevent race conditions when multiple
// instances start simultaneously (e.g. autoscaling, serverless cold starts).
// Stores a SHA-256 checksum per migration to detect if a file was edited
// after being applied — fails fast rather than silently drifting.

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Advisory lock — only one process runs migrations at a time.
    // Lock ID is arbitrary but must be consistent across all instances.
    await client.query('SELECT pg_advisory_lock(987654321)');

    // Ensure the tracking table exists (safe to run without a lock first
    // because CREATE TABLE IF NOT EXISTS is atomic in PostgreSQL)
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(255) PRIMARY KEY,
        checksum   VARCHAR(64)  NOT NULL,
        applied_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add checksum column to existing deployments that predate this change
    await client.query(`
      ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64) NOT NULL DEFAULT ''
    `);

    // Backfill checksums for any rows that were inserted before this column existed
    const migrationsDir = path.join(__dirname, 'migrations');
    const { rows: noChecksum } = await client.query(      "SELECT version FROM schema_migrations WHERE checksum = ''"
    );
    for (const { version } of noChecksum) {
      const filePath = path.join(migrationsDir, version);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      await client.query(
        'UPDATE schema_migrations SET checksum = $1 WHERE version = $2',
        [sha256(content), version]
      );
      console.log(`🔑 Checksum backfilled: ${version}`);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query('SELECT version, checksum FROM schema_migrations');
    const applied = new Map(rows.map(r => [r.version, r.checksum]));

    let ran = 0;
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const checksum = sha256(sql);

      if (applied.has(file)) {
        // Already applied — verify the file hasn't been modified
        const storedChecksum = applied.get(file);
        if (storedChecksum !== checksum) {
          throw new Error(
            `Migration tampered: ${file}\n` +
            `  stored checksum : ${storedChecksum}\n` +
            `  current checksum: ${checksum}\n` +
            `  Do NOT edit applied migrations. Create a new migration file instead.`
          );
        }
        continue;
      }

      console.log(`🔄 Running migration: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [file, checksum]
        );
        await client.query('COMMIT');
        console.log(`✅ Migration applied: ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed: ${file}`, err.message);
        throw err;
      }
    }

    if (ran === 0) {
      console.log('✅ Database schema up to date');
    } else {
      console.log(`✅ ${ran} migration(s) applied`);
    }
  } finally {
    // Always release the lock, even if migrations failed
    try { await client.query('SELECT pg_advisory_unlock(987654321)'); } catch (_) {}
    client.release();
  }
}

// ── Legacy alias — kept so server/index.js import doesn't break ───────────
const initializeDatabase = runMigrations;

module.exports = { pool, initializeDatabase, runMigrations, testConnection };
