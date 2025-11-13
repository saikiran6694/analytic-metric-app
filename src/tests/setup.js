import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

let pool;

beforeAll(async () => {
  const db = await import("../config/database.config.js");
  pool = db.default || db.pool; // depends on export type

  // Create required tables
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

  // Events Table (with partition-friendly structure)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      url TEXT,
      referrer TEXT,
      device VARCHAR(50),
      ip_address INET,
      user_agent TEXT,
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB,
      session_id VARCHAR(100),
      user_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indexes for events
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_events_app_id ON events(app_id);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_events_app_timestamp ON events(app_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id) WHERE user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id) WHERE session_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_events_metadata ON events USING GIN (metadata);
    CREATE INDEX IF NOT EXISTS idx_events_app_type_timestamp 
      ON events(app_id, event_type, timestamp DESC);
  `);

  // Event Summaries table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_summaries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      total_count INTEGER DEFAULT 0,
      unique_users INTEGER DEFAULT 0,
      device_data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(app_id, event_type, date)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_summaries_app_date ON event_summaries(app_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_summaries_app_type_date 
      ON event_summaries(app_id, event_type, date DESC);
  `);
});

afterEach(async () => {
  if (!pool) return;
  await pool.query("DELETE FROM event_summaries;");
  await pool.query("DELETE FROM events;");
  await pool.query("DELETE FROM api_keys;");
  await pool.query("DELETE FROM apps;");
});

afterAll(async () => {
  if (!pool) return;
  await pool.end();
});
