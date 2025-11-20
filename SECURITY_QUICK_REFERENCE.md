# Security & Safety - Quick Reference

## 🔴 Critical Issues (Fix Immediately)

| # | Issue | Location | Quick Fix |
|---|-------|----------|-----------|
| 1 | Hardcoded secrets | `docker-compose.yml` | Move to `.env` file |
| 2 | No rate limiting | All API routes | Add express-rate-limit |
| 3 | No account lockout | `auth.ts` | Add failed attempts tracking |
| 4 | In-process background jobs | `api/analysis/route.ts` | Use BullMQ |
| 5 | Unbounded data storage | Analysis results | Add size limits |
| 6 | No audit logging | Entire app | Create audit_logs table |

---

## Priority Checklist

### 🔥 Do Today (< 4 hours)
- [ ] Create `.env` file and move secrets
- [ ] Add rate limiting to login (5 attempts/15min)
- [ ] Add failed login counter to User model
- [ ] Document all environment variables in `.env.example`

### 📋 Do This Week (< 2 days)
- [ ] Implement account lockout mechanism
- [ ] Add security headers (helmet.js)
- [ ] Create audit_logs table
- [ ] Set up BullMQ for background jobs
- [ ] Add password complexity requirements
- [ ] Implement CSRF protection

### 📊 Do This Month (< 2 weeks)
- [ ] JWT refresh token system
- [ ] Circuit breaker for Klaviyo API
- [ ] Comprehensive error tracking (Sentry)
- [ ] Data retention policies
- [ ] Request size limits
- [ ] Database encryption at rest

---

## Code Snippets for Immediate Use

### 1. Rate Limiting (Add to API routes)
```typescript
import rateLimit from 'express-rate-limit'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// Apply to login route
export async function POST(req: NextRequest) {
  // Check rate limit here
  // ... rest of login logic
}
```

### 2. Account Lockout (Add to auth.ts)
```typescript
// After failed login:
await prisma.$executeRaw`
  UPDATE users 
  SET failed_login_attempts = failed_login_attempts + 1,
      locked_until = CASE 
        WHEN failed_login_attempts >= 4 
        THEN NOW() + INTERVAL '30 minutes'
        ELSE locked_until
      END
  WHERE id = ${userId}::uuid
`

// Before checking password:
if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
  throw new Error('Account temporarily locked. Try again later.')
}

// On successful login:
await prisma.$executeRaw`
  UPDATE users 
  SET failed_login_attempts = 0,
      locked_until = NULL
  WHERE id = ${userId}::uuid
`
```

### 3. Audit Logging
```typescript
// Create function
async function auditLog(data: {
  userId: string
  action: string
  resource: string
  result: 'success' | 'failure'
  metadata?: any
  ip?: string
}) {
  await prisma.$executeRaw`
    INSERT INTO audit_logs (user_id, action, resource, result, metadata, ip_address)
    VALUES (
      ${data.userId}::uuid,
      ${data.action},
      ${data.resource},
      ${data.result},
      ${JSON.stringify(data.metadata || {})}::jsonb,
      ${data.ip || 'unknown'}
    )
  `
}

// Usage
await auditLog({
  userId: session.user.id,
  action: 'analysis.create',
  resource: analysis.id,
  result: 'success',
  ip: request.ip
})
```

### 4. Security Headers (Add to next.config.mjs)
```javascript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  }
]

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

---

## Migration Commands

### Add Security Columns
```sql
-- User lockout
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255),
  result VARCHAR(20) NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## Environment Variables to Add

Create `.env` file:
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-hex-32>

# Encryption
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>

# Redis
REDIS_URL=redis://localhost:6379

# Monitoring (optional)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

Generate secrets:
```bash
openssl rand -hex 32
```

---

## Testing Security Fixes

### Test Rate Limiting
```bash
# Attempt multiple logins
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### Test Account Lockout
```bash
# After 5 failed attempts, this should be locked
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"correct"}'
```

### Test Audit Logs
```sql
-- View recent audit logs
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Failed login attempts
SELECT action, COUNT(*) 
FROM audit_logs 
WHERE result = 'failure' 
GROUP BY action;
```

---

## Monitoring Commands

```bash
# Check for locked accounts
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis \
  -c "SELECT email, failed_login_attempts, locked_until FROM users WHERE locked_until IS NOT NULL;"

# Check recent audit logs
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis \
  -c "SELECT action, result, COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY action, result;"

# Check active analyses
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis \
  -c "SELECT status, COUNT(*) FROM analyses GROUP BY status;"
```

---

## Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Next.js Security:** https://nextjs.org/docs/pages/building-your-application/configuring/security
- **Prisma Best Practices:** https://www.prisma.io/docs/guides/performance-and-optimization
- **BullMQ Documentation:** https://docs.bullmq.io/

---

*Quick reference for immediate security improvements*  
*See SECURITY_SAFETY_PLAN.md for full details*

