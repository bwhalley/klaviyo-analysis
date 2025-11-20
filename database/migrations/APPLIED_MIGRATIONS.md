# Applied Database Migrations

This file tracks which migrations have been applied to the database.

## Migration History

### 001_add_security_features.sql
**Applied:** 2025-11-20  
**Status:** ✅ Complete  
**Description:** Phase 1 Security Hardening  

**Changes:**
- Added `failed_login_attempts`, `locked_until`, `last_failed_login_at` to `users` table
- Enhanced `audit_logs` table with:
  - `session_id` - Track user sessions
  - `resource` - Resource being acted upon
  - `result` - success/failure/error
  - `error_message` - Error details
  - `ip_address_hash` - Privacy-preserving IP tracking
  - `referer` - HTTP referer
  - `duration_ms` - Action duration in milliseconds
- Added data retention columns to `users` table (for Phase 2)
- Added OAuth token storage columns to `users` table (for Phase 2)
- Added `retention_override_days`, `archived_at` to `analyses` table (for Phase 2)
- Created helper functions: `hash_ip_address()`, `is_account_locked()`
- Created indexes for performance

**How to Apply:**
```bash
docker-compose exec -T db psql -U klaviyo_user -d klaviyo_analysis < database/migrations/001_add_security_features.sql
```

**Verification:**
```bash
# Check users table columns
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "\d users"

# Check audit_logs table columns
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "\d audit_logs"

# Verify audit logging is working
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "SELECT action, result, COUNT(*) FROM audit_logs GROUP BY action, result;"
```

---

## How to Create and Apply New Migrations

### 1. Create Migration File
```bash
cd database/migrations
nano 002_your_migration_name.sql
```

### 2. Add Header
```sql
-- Migration: [Brief Description]
-- Description: [Detailed description]
-- Date: YYYY-MM-DD
-- Depends on: [Previous migration if any]

-- Your SQL here...
```

### 3. Apply Migration
```bash
docker-compose exec -T db psql -U klaviyo_user -d klaviyo_analysis < database/migrations/002_your_migration_name.sql
```

### 4. Update This File
Add an entry above with:
- Migration number and name
- Date applied
- Status (✅ Complete / ⚠️ Partial / ❌ Failed)
- Description of changes
- How to apply
- How to verify

---

## Rollback Procedures

### Rolling Back 001_add_security_features.sql

**⚠️ WARNING:** This will delete audit logs and remove security features!

```sql
-- Drop added columns from users
ALTER TABLE users
DROP COLUMN IF EXISTS failed_login_attempts,
DROP COLUMN IF EXISTS locked_until,
DROP COLUMN IF EXISTS last_failed_login_at,
DROP COLUMN IF EXISTS retention_failed_analyses_days,
DROP COLUMN IF EXISTS retention_completed_analyses_days,
DROP COLUMN IF EXISTS retention_auto_archive_days,
DROP COLUMN IF EXISTS klaviyo_oauth_access_token,
DROP COLUMN IF EXISTS klaviyo_oauth_refresh_token,
DROP COLUMN IF EXISTS klaviyo_oauth_token_expires_at,
DROP COLUMN IF EXISTS klaviyo_oauth_scopes,
DROP COLUMN IF EXISTS klaviyo_oauth_connected_at;

-- Drop added columns from analyses
ALTER TABLE analyses
DROP COLUMN IF EXISTS retention_override_days,
DROP COLUMN IF EXISTS archived_at;

-- Drop added columns from audit_logs (or drop the whole table if it was created by this migration)
-- If audit_logs was created by init.sql, just drop the new columns:
ALTER TABLE audit_logs
DROP COLUMN IF EXISTS session_id,
DROP COLUMN IF EXISTS resource,
DROP COLUMN IF EXISTS result,
DROP COLUMN IF EXISTS error_message,
DROP COLUMN IF EXISTS ip_address_hash,
DROP COLUMN IF EXISTS referer,
DROP COLUMN IF EXISTS duration_ms;

-- Drop helper functions
DROP FUNCTION IF EXISTS hash_ip_address(TEXT);
DROP FUNCTION IF EXISTS is_account_locked(UUID);
DROP FUNCTION IF EXISTS auto_unlock_account();
```

---

## Migration Status

| Migration | Applied | Status | Notes |
|-----------|---------|--------|-------|
| 001_add_security_features.sql | 2025-11-20 | ✅ | Phase 1 security features |

---

## Troubleshooting

### "Column already exists" errors
This is normal if running a migration multiple times. The migration uses `IF NOT EXISTS` clauses.

### "Table already exists" errors
Same as above - migrations are designed to be idempotent where possible.

### Checking current database schema
```bash
# List all tables
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "\dt"

# Describe specific table
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "\d table_name"

# List all columns in a table
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "\d+ table_name"
```

### Verifying data
```bash
# Check recent audit logs
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"

# Check users with failed login attempts
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis -c "SELECT email, failed_login_attempts, locked_until FROM users WHERE failed_login_attempts > 0;"
```

