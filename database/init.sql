-- Klaviyo Analysis Database Initialization Script
-- This script sets up the initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- NextAuth Tables
-- ============================================
CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);

CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  expires TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP(3) NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Indexes for NextAuth tables
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    
    -- Klaviyo credentials (encrypted)
    klaviyo_api_key_encrypted TEXT,
    klaviyo_account_id VARCHAR(255),
    
    -- User preferences
    timezone VARCHAR(50) DEFAULT 'UTC',
    default_cohort_period VARCHAR(10) DEFAULT 'week', -- day, week, month
    
    -- Metadata
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) DEFAULT 'user', -- user, admin
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- ============================================
-- Analyses Table
-- ============================================
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Analysis metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    
    -- Analysis parameters
    params JSONB NOT NULL DEFAULT '{}',
    -- Example params structure:
    -- {
    --   "dateRange": {"start": "2024-01-01", "end": "2024-12-31"},
    --   "cohortPeriod": "week",
    --   "filters": {"lists": ["LIST_ID"], "segments": ["SEGMENT_ID"]}
    -- }
    
    -- Results
    results JSONB,
    -- Example results structure:
    -- {
    --   "statistics": {
    --     "totalSubscribers": 1000,
    --     "subscribersWithOrder": 320,
    --     "conversionRate": 32.0,
    --     "meanDaysToFirstOrder": 12.5,
    --     "medianDaysToFirstOrder": 8.0,
    --     "stdDev": 15.3,
    --     "percentiles": {"p25": 3, "p75": 18, "p90": 35, "p95": 52}
    --   },
    --   "cohortData": [...]
    -- }
    
    -- Error tracking
    error_message TEXT,
    error_stack TEXT,
    
    -- Performance metrics
    execution_time_ms INTEGER,
    events_processed INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- ============================================
-- Analysis Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    
    -- Profile data
    profile_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    
    -- Dates
    subscription_date TIMESTAMP NOT NULL,
    first_order_date TIMESTAMP,
    
    -- Calculated fields
    days_to_first_order INTEGER,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- API Keys Table (for storing encrypted Klaviyo keys)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Key data
    name VARCHAR(255) NOT NULL,
    key_encrypted TEXT NOT NULL,
    key_prefix VARCHAR(10), -- First few chars for identification (e.g., "pk_abc...")
    
    -- Permissions
    scopes TEXT[], -- e.g., ['read:metrics', 'read:events']
    
    -- Metadata
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ============================================
-- Audit Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event details
    action VARCHAR(100) NOT NULL, -- e.g., 'analysis.created', 'user.login'
    resource_type VARCHAR(50), -- e.g., 'analysis', 'user'
    resource_id UUID,
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Scheduled Analyses Table (for recurring analyses)
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Schedule details
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL, -- e.g., '0 0 * * 1' (weekly on Monday)
    
    -- Analysis parameters
    params JSONB NOT NULL DEFAULT '{}',
    
    -- Notification settings
    notify_on_completion BOOLEAN DEFAULT TRUE,
    notification_email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Analyses indexes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_status ON analyses(user_id, status);

-- Analysis profiles indexes
CREATE INDEX IF NOT EXISTS idx_analysis_profiles_analysis_id ON analysis_profiles(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_profiles_profile_id ON analysis_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_analysis_profiles_subscription_date ON analysis_profiles(subscription_date);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Scheduled analyses indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_analyses_user_id ON scheduled_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_analyses_next_run ON scheduled_analyses(next_run_at) WHERE is_active = TRUE;

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for analyses table
-- NOTE: Disabled because analyses table doesn't have updated_at column
-- If you add updated_at to analyses, uncomment this trigger:
-- CREATE TRIGGER update_analyses_updated_at
--     BEFORE UPDATE ON analyses
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

-- Trigger for scheduled_analyses table
CREATE TRIGGER update_scheduled_analyses_updated_at
    BEFORE UPDATE ON scheduled_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed Data (Optional - for development)
-- ============================================

-- Create a default admin user (password: admin123)
-- NOTE: Change this in production!
INSERT INTO users (email, password_hash, name, role, email_verified)
VALUES (
    'admin@klaviyo-analysis.local',
    '$2b$10$rZ7LqKfKXqQRkfKqX5YBx.YkU8qZvXqY7pKfL9qZvXqY7pKfL9qZv', -- hashed "admin123"
    'Admin User',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Grant Permissions
-- ============================================

-- Grant all privileges to the app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO klaviyo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO klaviyo_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO klaviyo_user;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE users IS 'Stores user accounts and authentication data';
COMMENT ON TABLE analyses IS 'Stores analysis runs and their results';
COMMENT ON TABLE analysis_profiles IS 'Stores detailed profile-level data for each analysis';
COMMENT ON TABLE api_keys IS 'Stores encrypted Klaviyo API keys for users';
COMMENT ON TABLE audit_logs IS 'Tracks all user actions for security and compliance';
COMMENT ON TABLE scheduled_analyses IS 'Stores recurring analysis schedules';

COMMENT ON COLUMN users.klaviyo_api_key_encrypted IS 'Encrypted Klaviyo API key using AES-256';
COMMENT ON COLUMN analyses.params IS 'JSON object containing analysis configuration';
COMMENT ON COLUMN analyses.results IS 'JSON object containing analysis results';
COMMENT ON COLUMN analysis_profiles.days_to_first_order IS 'Number of days from subscription to first order';

