# Phase 1 Setup Instructions

## Quick Start (5 minutes)

### 1. Create Environment File
```bash
cd /Users/brianwhalley/Downloads/klaviyo-analysis
cp env.example .env
```

### 2. Generate Secrets
```bash
# Generate NEXTAUTH_SECRET (copy the output)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (copy the output)
openssl rand -hex 32
```

### 3. Edit `.env` File
```bash
# Open .env in your editor
nano .env  # or use your preferred editor

# Required changes:
# - Set NEXTAUTH_SECRET=<output from step 2>
# - Set ENCRYPTION_KEY=<output from step 2>
# - Set POSTGRES_PASSWORD=<your secure password>
# - Set PGADMIN_DEFAULT_PASSWORD=<your secure password>
```

### 4. Update DATABASE_URL in .env
```bash
# Replace CHANGE_THIS_PASSWORD with your POSTGRES_PASSWORD:
DATABASE_URL=postgresql://klaviyo_user:YOUR_PASSWORD@db:5432/klaviyo_analysis
```

### 5. Rebuild and Start
```bash
docker-compose down -v --rmi all
docker-compose up -d --build
```

### 6. Run Database Migration
```bash
# Wait for database to be ready (about 10 seconds)
sleep 10

# Run the security migration
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis \
  -f /docker-entrypoint-initdb.d/migrations/001_add_security_features.sql
```

### 7. Verify Everything Works
```bash
# Check if all services are healthy
docker-compose ps

# Check application logs
docker-compose logs web --tail=50

# Test the health endpoint
curl http://localhost:3000/api/health
```

---

## If You Get Errors

### "NEXTAUTH_SECRET is not defined"
- Make sure you created `.env` file
- Make sure NEXTAUTH_SECRET is at least 32 characters long

### "Migration already applied" errors
- This is OK! It means the tables already exist
- The migration is idempotent and safe to run multiple times

### "Connection refused" from Redis
- Redis takes a few seconds to start
- Wait 10 seconds and try again

### Prisma errors about missing fields
- Make sure you've pulled the latest code
- Run: `docker-compose down -v --rmi all && docker-compose up -d --build`

---

## Testing the New Features

### 1. Test Account Creation
```bash
# Create an account (should require strong password)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "StrongP@ssw0rd123",
    "name": "Test User"
  }'
```

### 2. Test Rate Limiting
```bash
# Try multiple failed logins (should be blocked after 5)
for i in {1..10}; do
  echo "Attempt $i"
  curl -X POST http://localhost:3000/api/auth/callback/credentials \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"WrongPassword"}'
  echo ""
done
```

### 3. Test Account Lockout
```bash
# After 5 failed attempts, try with correct password
# Should still be locked for 30 minutes
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"StrongP@ssw0rd123"}'
```

### 4. Check Audit Logs
```bash
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis \
  -c "SELECT action, result, COUNT(*) FROM audit_logs GROUP BY action, result ORDER BY action;"
```

### 5. Manual Account Unlock (if needed)
```bash
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis \
  -c "UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE email = 'test@example.com';"
```

---

## Production Deployment

When deploying to production:

1. **Use strong, unique secrets**
   ```bash
   # Generate new secrets for production
   openssl rand -hex 32
   ```

2. **Use environment variables, not .env files**
   - Set them in your hosting provider's dashboard
   - Docker secrets, Kubernetes secrets, etc.

3. **Adjust rate limits** for your traffic:
   ```env
   RATE_LIMIT_MAX_REQUESTS=50           # Stricter
   LOGIN_RATE_LIMIT_MAX_ATTEMPTS=3      # More secure
   ACCOUNT_LOCKOUT_DURATION_MINUTES=60  # Longer lockout
   ```

4. **Enable HTTPS** and update:
   ```env
   NEXTAUTH_URL=https://yourdomain.com
   ```

5. **Configure trusted proxy** for accurate IP detection

---

## Troubleshooting

### Issue: Can't connect to localhost:3000
**Solution:** Check if the container is running:
```bash
docker-compose ps
docker-compose logs web
```

### Issue: Database connection errors
**Solution:** Check if PostgreSQL is ready:
```bash
docker-compose logs db | grep "ready to accept connections"
```

### Issue: Redis connection errors  
**Solution:** Redis is optional during build, but required at runtime:
```bash
docker-compose logs redis
```

### Issue: Audit logs not being created
**Solution:** Check if the table exists:
```bash
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis \
  -c "\d audit_logs"
```

---

## Rollback

If you need to rollback Phase 1 changes:

```bash
# Switch back to main branch
git checkout main

# Rebuild
docker-compose down -v --rmi all
docker-compose up -d --build
```

---

## Next Steps

Once Phase 1 is working:
1. Test all features thoroughly
2. Review audit logs
3. Adjust rate limits based on your usage
4. Move to Phase 2: Data Protection & OAuth

---

## Support

- See `SECURITY_QUICK_REFERENCE.md` for quick fixes
- See `SECURITY_SAFETY_PLAN.md` for full details
- See `PHASE1_IMPLEMENTATION_COMPLETE.md` for technical details

