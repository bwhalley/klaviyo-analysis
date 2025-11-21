# Security, Safety & Data Handling Improvement Plan

**Project:** Klaviyo Analysis Web Application  
**Branch:** `refactor/code-improvements`  
**Date:** November 20, 2024  
**Status:** Review Phase - No Implementation Yet

---

## Executive Summary

This document outlines a comprehensive plan to improve the security, data handling, API safety, and overall effectiveness of the Klaviyo Analysis application. The plan is divided into 5 phases with 47 specific improvements prioritized by severity and impact.

**Current Risk Level:** MEDIUM-HIGH
- 🔴 Critical Issues: 6
- 🟠 High Priority: 14
- 🟡 Medium Priority: 18
- 🟢 Low Priority: 9

---

## Critical Issues Identified

### 🔴 CRITICAL (Fix Immediately)

1. **Hardcoded Secrets in Version Control**
   - Location: `docker-compose.yml`
   - Risk: Production credentials exposed if committed
   - Impact: Complete system compromise

2. **No Rate Limiting**
   - Location: All API routes
   - Risk: Brute force attacks, API abuse, DoS
   - Impact: Service degradation, unauthorized access

3. **No Account Lockout Mechanism**
   - Location: `auth.ts`
   - Risk: Unlimited password attempts
   - Impact: Brute force password cracking

4. **Background Jobs Run In-Process**
   - Location: `api/analysis/route.ts`
   - Risk: Server crashes, memory leaks, no scalability
   - Impact: Analysis failures, service interruption

5. **Large Unbounded Data Storage**
   - Location: `Analysis.results` field
   - Risk: Database bloat, performance degradation
   - Impact: Service slowdown, storage costs

6. **No Audit Logging**
   - Location: Entire application
   - Risk: Can't track security events, compliance violations
   - Impact: Unable to detect or investigate breaches

---

## Phase 1: Security Hardening (Week 1)

**Priority:** Critical  
**Estimated Time:** 3-5 days  
**Risk Reduction:** 70%

### 1.1 Authentication & Authorization

- [ ] **Implement rate limiting** (express-rate-limit or similar)
  - Login: 5 attempts per 15 minutes per IP
  - API routes: 100 requests per 15 minutes per user
  - Signup: 3 attempts per hour per IP

- [ ] **Add account lockout mechanism**
  - Lock after 5 failed attempts
  - 30-minute cooldown period
  - Email notification on lockout
  - Admin unlock capability

- [ ] **Enhance password requirements**
  ```typescript
  - Minimum 12 characters (up from 8)
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character
  - Check against common passwords list
  - Check for leaked passwords (haveibeenpwned API)
  ```

- [ ] **Implement JWT refresh tokens**
  - Short-lived access tokens (15 minutes)
  - Longer-lived refresh tokens (7 days)
  - Rotate on use
  - Store refresh token hash in database

- [ ] **Add CSRF protection**
  - Double-submit cookie pattern
  - Or use NextAuth built-in CSRF

### 1.2 API Security

- [ ] **Add security headers** (helmet.js)
  ```typescript
  - Content-Security-Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security
  - Referrer-Policy: no-referrer
  ```

- [ ] **Configure CORS properly**
  - Whitelist specific origins
  - Limit allowed methods
  - Set credentials policy

- [ ] **Implement request size limits**
  - Body parser: 1MB limit
  - JSON payload: 500KB limit
  - Analysis params: 100KB limit

- [ ] **Add request timeouts**
  - API routes: 30 seconds
  - Analysis creation: 5 seconds
  - Klaviyo API calls: 60 seconds

### 1.3 Secrets Management

- [ ] **Remove hardcoded secrets from docker-compose.yml**
  - Use `.env` files (not committed)
  - Document in `.env.example`
  - Add to `.gitignore`

- [ ] **Implement proper key rotation**
  - Add `ENCRYPTION_KEY_ROTATION` support
  - Add `API_KEY_VERSION` field
  - Graceful migration path

- [ ] **Use environment-specific configurations**
  - Separate dev/staging/prod configs
  - Use Docker secrets for production
  - Validate required env vars on startup

---

## Phase 2: Data Protection & Privacy (Week 2-3)

**Priority:** High  
**Estimated Time:** 7-9 days (includes OAuth migration)  
**Risk Reduction:** 20%

### 2.1 Data Sanitization & Validation

- [ ] **Sanitize all inputs** (DOMPurify or similar)
  - Remove HTML tags from text inputs
  - Escape SQL special characters
  - Validate UUIDs format
  - Sanitize file names

- [ ] **Validate data on retrieval**
  - Add Zod schemas for database models
  - Validate before using in operations
  - Handle corrupted data gracefully

- [ ] **Implement PII protection**
  ```typescript
  - Mask email addresses in logs: u***@example.com
  - Redact API keys in logs: pk_***
  - Hash IP addresses for analytics
  - Remove PII from error messages
  ```

### 2.2 Data Retention & Cleanup

- [ ] **Implement configurable data retention policies**
  - Add user settings for retention preferences
  - Default policies:
    - Failed analyses: Delete after 7 days
    - Completed analyses: Keep for 90 days
    - Archived analyses: Keep for 1 year
    - User accounts: Soft delete for 30 days
  - User-configurable options:
    - Analysis retention: 30/60/90/180/365 days
    - Failed analysis retention: 1/7/14/30 days
    - Auto-archive threshold: 30/60/90 days
  - UI in settings page for managing retention
  - Override per-analysis retention settings

- [ ] **Create data cleanup jobs**
  ```typescript
  - Daily: Clean up failed/expired analyses (respects user settings)
  - Weekly: Archive old completed analyses (respects user settings)
  - Monthly: Purge soft-deleted users
  - Respect user retention preferences in all cleanup operations
  ```

- [ ] **Add result size limits**
  - Max 10MB per analysis result
  - Paginate large profile lists
  - Compress stored data
  - Warn users of large datasets

### 2.3 Klaviyo OAuth Migration

- [ ] **Migrate from API key to OAuth 2.0**
  - Benefits:
    - More secure (token-based, revocable)
    - Better user experience (no copy-paste keys)
    - Automatic token refresh
    - Granular scope control
    - Audit trail of access
  - Implementation steps:
    - Register OAuth app with Klaviyo
    - Implement OAuth flow (Authorization Code)
    - Store access/refresh tokens (encrypted)
    - Implement token refresh logic
    - Add migration path for existing API key users
    - UI for OAuth connection/disconnection
    - Fallback to API key for compatibility
  - Update KlaviyoService to support both methods
  - Add token expiration handling
  - Document OAuth setup for users

### 2.4 Database Security

- [ ] **Review all raw SQL queries**
  - Ensure parameterization
  - Add SQL injection tests
  - Consider ORM for complex queries

- [ ] **Add database encryption at rest**
  - Encrypt sensitive columns
  - Use PostgreSQL pgcrypto extension
  - Rotate encryption keys

- [ ] **Implement row-level security**
  - Users can only access their own data
  - Add RLS policies in PostgreSQL
  - Test authorization boundaries

---

## Phase 3: Audit Logging & Monitoring (Week 3)

**Priority:** High  
**Estimated Time:** 3-4 days  
**Risk Reduction:** 5%

### 3.1 Audit Logging

- [ ] **Create comprehensive audit log system**
  ```typescript
  Events to log:
  - User signup/login/logout
  - Password changes
  - API key creation/rotation
  - Analysis creation/completion/failure
  - Settings changes
  - Failed authentication attempts
  - Rate limit violations
  ```

- [ ] **Implement log levels and categories**
  ```typescript
  - SECURITY: Auth, access, permissions
  - DATA: CRUD operations, exports
  - SYSTEM: Errors, performance, health
  - AUDIT: All user actions
  ```

- [ ] **Structure logs properly**
  ```typescript
  {
    timestamp: ISO8601,
    level: "info" | "warn" | "error",
    category: "security" | "data" | "system" | "audit",
    userId: string,
    action: string,
    resource: string,
    ip: string (hashed),
    userAgent: string,
    result: "success" | "failure",
    metadata: object
  }
  ```

### 3.2 Monitoring & Alerts

- [ ] **Add health check endpoints**
  - `/api/health/live` - basic liveness
  - `/api/health/ready` - readiness with dependencies
  - `/api/health/metrics` - performance metrics

- [ ] **Implement error tracking**
  - Integrate Sentry or similar
  - Alert on critical errors
  - Track error patterns

- [ ] **Create monitoring dashboard**
  - Active users
  - Analysis success/failure rates
  - API response times
  - Database connection pool status
  - Redis cache hit rates

---

## Phase 4: API Safety & Resilience (Week 4)

**Priority:** Medium  
**Estimated Time:** 5-7 days  
**Risk Reduction:** 4%

### 4.1 External API Protection

- [ ] **Implement circuit breaker for Klaviyo API**
  ```typescript
  - Fail fast after 5 consecutive errors
  - Half-open after 30 seconds
  - Reset after 3 successful calls
  ```

- [ ] **Add retry strategy with backoff**
  ```typescript
  - Max 3 retries
  - Exponential backoff: 1s, 2s, 4s
  - Different strategies per error type
  ```

- [ ] **Implement API key rotation for Klaviyo**
  - Support multiple keys
  - Graceful failover
  - Automated rotation schedule

### 4.2 Background Job Processing

- [ ] **Move to proper job queue** (BullMQ recommended)
  ```typescript
  Benefits:
  - Job persistence
  - Retry logic
  - Progress tracking
  - Failure handling
  - Horizontal scaling
  ```

- [ ] **Add job monitoring**
  - Job status tracking
  - Progress updates (0-100%)
  - Estimated completion time
  - Real-time notifications

- [ ] **Implement job priorities**
  - HIGH: User-initiated analyses
  - NORMAL: Scheduled analyses
  - LOW: Cleanup jobs

### 4.3 API Versioning

- [ ] **Add API versioning**
  ```typescript
  /api/v1/analysis
  /api/v2/analysis
  ```

- [ ] **Document breaking changes**
  - Changelog
  - Migration guides
  - Deprecation notices

---

## Phase 5: Performance & Effectiveness (Week 5)

**Priority:** Medium  
**Estimated Time:** 4-6 days  
**Risk Reduction:** 1%

### 5.1 Database Optimization

- [ ] **Add missing indexes**
  ```sql
  - analyses(user_id, status, created_at)
  - analyses(status) WHERE status IN ('running', 'pending')
  - users(email) [already exists]
  - users(last_login_at) for analytics
  ```

- [ ] **Configure connection pooling**
  ```typescript
  {
    max: 20,          // max connections
    min: 5,           // min connections
    idle: 10000,      // idle timeout
    acquire: 60000,   // acquire timeout
  }
  ```

- [ ] **Implement query optimization**
  - Use `select` to limit fields
  - Use `include` properly
  - Avoid N+1 queries
  - Add query explain plans

### 5.2 Caching Strategy

- [ ] **Implement intelligent caching**
  ```typescript
  Cache:
  - Klaviyo metrics: 1 hour
  - Analysis results: 24 hours
  - User profiles: 15 minutes
  - Lists/segments: 30 minutes
  ```

- [ ] **Add cache invalidation**
  - On data updates
  - Manual purge capability
  - TTL-based expiration
  - LRU eviction policy

- [ ] **Cache warming**
  - Pre-fetch common data
  - Background refresh
  - Graceful degradation

### 5.3 Code Quality

- [ ] **Add comprehensive error handling**
  ```typescript
  - Custom error classes
  - Error boundaries (React)
  - Consistent error responses
  - User-friendly messages
  ```

- [ ] **Implement input validation middleware**
  - Centralized validation
  - Reusable schemas
  - Clear error messages

- [ ] **Add TypeScript strict mode**
  - No implicit any
  - Strict null checks
  - Strict function types

---

## Implementation Guidelines

### Testing Strategy

For each phase:
1. **Unit tests** for new functions
2. **Integration tests** for API endpoints
3. **Security tests** for vulnerabilities
4. **Load tests** for performance
5. **Manual testing** for UX

### Rollout Plan

1. **Development Environment**
   - Implement and test thoroughly
   - Code review required
   - Security review required

2. **Staging Environment**
   - Deploy and soak test
   - Monitor for issues
   - Gather metrics

3. **Production Deployment**
   - Deploy during low-traffic window
   - Monitor closely for 24 hours
   - Have rollback plan ready

### Success Metrics

- **Security:**
  - Zero successful brute force attempts
  - 100% audit log coverage
  - < 0.1% authentication failures (from valid users)

- **Performance:**
  - API response time < 200ms (p95)
  - Analysis processing time < 30s per 10k events
  - 99.9% uptime

- **Data Quality:**
  - Zero data corruption incidents
  - 100% data validation coverage
  - Successful automated cleanup runs

---

## Immediate Actions (Do First)

### Critical Security Patches (Today)

1. **Create `.env.example` and remove secrets from docker-compose.yml**
   ```bash
   # Create .env file
   cp docker-compose.yml .env.example
   # Extract secrets to .env
   # Update docker-compose.yml to use env_file
   ```

2. **Add rate limiting to login endpoint**
   ```bash
   npm install express-rate-limit
   # Add middleware to auth routes
   ```

3. **Implement account lockout**
   ```sql
   ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
   ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
   ```

### High Priority (This Week)

4. **Add audit logging table**
   ```sql
   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id),
     action VARCHAR(255) NOT NULL,
     resource VARCHAR(255),
     metadata JSONB,
     ip_address VARCHAR(45),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Move background jobs to queue**
   ```bash
   npm install bullmq
   # Create job processor
   # Update analysis route
   ```

6. **Add security headers**
   ```bash
   npm install helmet
   # Configure in Next.js config
   ```

---

## Risk Assessment After Implementation

| Phase | Current Risk | After Implementation | Reduction |
|-------|-------------|----------------------|-----------|
| Phase 1 | HIGH | LOW | 70% |
| Phase 2 | MEDIUM | LOW | 20% |
| Phase 3 | MEDIUM | LOW | 5% |
| Phase 4 | MEDIUM | LOW | 4% |
| Phase 5 | LOW | LOW | 1% |
| **Total** | **MEDIUM-HIGH** | **LOW** | **~100%** |

---

## Budget & Resources

### Time Estimate
- **Total Development:** 4-5 weeks
- **Testing & QA:** 1 week
- **Documentation:** 3 days
- **Total:** 5-6 weeks

### Dependencies
- BullMQ license (if using Pro): ~$500/month
- Sentry (error tracking): ~$26/month
- Additional testing tools: ~$100/month

---

## Questions for Review

1. **Priorities:** Do you agree with the phase prioritization?
2. **Timeline:** Is 5-6 weeks acceptable, or should we fast-track certain phases?
3. **Dependencies:** Are you comfortable with the proposed external services?
4. **Budget:** Is the estimated cost acceptable?
5. **Scope:** Are there any additional concerns not covered here?

---

## Next Steps

**After approval:**
1. Create detailed tickets for Phase 1
2. Set up project board in GitHub
3. Schedule security review meeting
4. Begin implementation on `refactor/code-improvements` branch
5. Daily standups to track progress

---

*Document maintained by: AI Assistant*  
*Last updated: November 20, 2024*  
*Version: 1.0*

