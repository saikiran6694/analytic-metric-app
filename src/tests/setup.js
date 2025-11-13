import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

// Dynamically import pool AFTER dotenv is loaded
let pool;

beforeAll(async () => {
  const db = await import("../config/database.config.js");
  pool = db.default || db.pool; // depends on how you export it

  // Create test tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_name VARCHAR(255) NOT NULL,
      app_url VARCHAR(500) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, app_url)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      key_hash VARCHAR(255) NOT NULL UNIQUE,
      key_prefix VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_key_per_app 
      ON api_keys(app_id) WHERE is_active = true;
  `);
});

// Delete all data after each test
afterEach(async () => {
  if (!pool) return;
  await pool.query("DELETE FROM api_keys;");
  await pool.query("DELETE FROM apps;");
});

// Close the database connection after all tests
afterAll(async () => {
  if (!pool) return;
  await pool.end();
});
