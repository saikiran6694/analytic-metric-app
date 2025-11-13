CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name VARCHAR(255) NOT NULL,
  app_url VARCHAR(500) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, app_url)
);

CREATE INDEX idx_apps_user_id ON apps(user_id);


CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

-- Partial unique index ensures only one active key per app
CREATE UNIQUE INDEX idx_unique_active_key_per_app ON api_keys(app_id) WHERE is_active = true;
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_app_id ON api_keys(app_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;



-- Events table with partitioning support for scalability
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
  -- Performance indexes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_events_app_id ON events(app_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_app_timestamp ON events(app_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id) WHERE session_id IS NOT NULL;

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_events_metadata ON events USING GIN (metadata);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_app_type_timestamp 
  ON events(app_id, event_type, timestamp DESC);

-- Table for aggregated event summaries (for caching/performance)
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

CREATE INDEX IF NOT EXISTS idx_summaries_app_date ON event_summaries(app_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_app_type_date ON event_summaries(app_id, event_type, date DESC);