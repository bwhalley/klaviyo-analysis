-- Migration: Add Security Features
-- Description: Adds account lockout, audit logging, and security enhancements
-- Date: 2024-11-20

-- ============================================
-- 1. Add Account Lockout Fields to Users
-- ============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) 
WHERE locked_until IS NOT NULL;

COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.locked_until IS 'Account is locked until this timestamp';
COMMENT ON COLUMN users.last_failed_login_at IS 'Timestamp of the most recent failed login';

-- ============================================
-- 2. Create Audit Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255),
  resource_id UUID,
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'error')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),  -- Supports IPv4 and IPv6
  ip_address_hash VARCHAR(64),  -- SHA256 hash for privacy
  user_agent TEXT,
  referer TEXT,
  duration_ms INT,  -- How long the action took
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(user_id, action, created_at DESC);

-- Partial index for failures (most important to query)
CREATE INDEX IF NOT EXISTS idx_audit_logs_failures 
ON audit_logs(user_id, action, created_at DESC) 
WHERE result = 'failure';

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all user actions and security events';
COMMENT ON COLUMN audit_logs.ip_address_hash IS 'SHA256 hash of IP address for privacy-preserving analytics';
COMMENT ON COLUMN audit_logs.duration_ms IS 'Duration of the action in milliseconds';

-- ============================================
-- 3. Add Data Retention Settings to Users
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS retention_failed_analyses_days INT DEFAULT 7 CHECK (retention_failed_analyses_days > 0),
ADD COLUMN IF NOT EXISTS retention_completed_analyses_days INT DEFAULT 90 CHECK (retention_completed_analyses_days > 0),
ADD COLUMN IF NOT EXISTS retention_auto_archive_days INT DEFAULT 30 CHECK (retention_auto_archive_days > 0);

COMMENT ON COLUMN users.retention_failed_analyses_days IS 'Days to keep failed analyses before deletion';
COMMENT ON COLUMN users.retention_completed_analyses_days IS 'Days to keep completed analyses before deletion';
COMMENT ON COLUMN users.retention_auto_archive_days IS 'Days before auto-archiving old analyses';

-- ============================================
-- 4. Add OAuth Token Storage
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS klaviyo_oauth_access_token TEXT,
ADD COLUMN IF NOT EXISTS klaviyo_oauth_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS klaviyo_oauth_token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS klaviyo_oauth_scopes TEXT[],
ADD COLUMN IF NOT EXISTS klaviyo_oauth_connected_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_oauth_expires ON users(klaviyo_oauth_token_expires_at) 
WHERE klaviyo_oauth_token_expires_at IS NOT NULL;

COMMENT ON COLUMN users.klaviyo_oauth_access_token IS 'Encrypted OAuth access token for Klaviyo API';
COMMENT ON COLUMN users.klaviyo_oauth_refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN users.klaviyo_oauth_token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN users.klaviyo_oauth_scopes IS 'Array of OAuth scopes granted';

-- ============================================
-- 5. Add Analysis Retention Override
-- ============================================

ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS retention_override_days INT CHECK (retention_override_days > 0),
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_analyses_archived_at ON analyses(archived_at) 
WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN analyses.retention_override_days IS 'Override user default retention for this specific analysis';
COMMENT ON COLUMN analyses.archived_at IS 'When this analysis was archived';

-- ============================================
-- 6. Helper Functions
-- ============================================

-- Function to hash IP addresses for privacy
CREATE OR REPLACE FUNCTION hash_ip_address(ip_address TEXT)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(digest(ip_address || current_setting('app.ip_salt', true), 'sha256'), 'hex');
EXCEPTION
  WHEN OTHERS THEN
    RETURN encode(digest(ip_address, 'sha256'), 'hex');
END;
$$;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  lock_until TIMESTAMP;
BEGIN
  SELECT locked_until INTO lock_until 
  FROM users 
  WHERE id = user_uuid;
  
  RETURN (lock_until IS NOT NULL AND lock_until > NOW());
END;
$$;

-- ============================================
-- 7. Trigger to automatically unlock accounts
-- ============================================

CREATE OR REPLACE FUNCTION auto_unlock_account()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.locked_until IS NOT NULL AND NEW.locked_until <= NOW() THEN
    NEW.locked_until := NULL;
    NEW.failed_login_attempts := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_unlock_account
BEFORE SELECT ON users
FOR EACH ROW
EXECUTE FUNCTION auto_unlock_account();

-- ============================================
-- 8. Grant Permissions
-- ============================================

GRANT SELECT, INSERT ON audit_logs TO klaviyo_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO klaviyo_user;

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables exist
DO $$
BEGIN
  ASSERT (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs')), 
    'audit_logs table was not created';
  
  ASSERT (SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts')), 
    'failed_login_attempts column was not added to users';
  
  RAISE NOTICE 'Security features migration completed successfully';
END $$;

