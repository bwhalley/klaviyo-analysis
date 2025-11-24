# Security & Safety Best Practices

**Project:** Klaviyo Analysis Web Application  
**Updated:** November 24, 2024  
**Status:** Operational Guide

---

## Executive Summary

This document outlines security best practices and operational guidelines for the Klaviyo Analysis application. Follow these guidelines to maintain a secure deployment and protect your data.

**Security Model:**
- 🔒 Local-first processing (data never leaves your control)
- 🔐 Encrypted API key storage (AES-256)
- 👤 User authentication with NextAuth.js
- 📊 Row-level security in PostgreSQL
- 🛡️ Audit logging for sensitive operations

---

## Pre-Deployment Security Checklist

Before deploying to production, ensure you've completed these critical security steps:

### 🔐 Secrets Management

- [ ] **Generate Secure Secrets**
  ```bash
  # Generate NEXTAUTH_SECRET (32+ characters)
  openssl rand -base64 32
  
  # Generate ENCRYPTION_KEY for API keys
  openssl rand -hex 32
  ```

- [ ] **Configure Environment Variables**
  - Copy `env.example` to `.env`
  - Fill in all required values
  - Never commit `.env` to version control
  - Use Docker secrets in production

- [ ] **Change Default Passwords**
  - PostgreSQL: Update `POSTGRES_PASSWORD`
  - PgAdmin: Change default admin credentials
  - Application: Ensure strong user passwords

### 🛡️ Authentication & Authorization

- [ ] **Password Requirements**
  - Minimum 8 characters (12+ recommended)
  - Mix of letters, numbers, and symbols
  - Consider using a password manager

- [ ] **API Key Security**
  - Klaviyo API keys are encrypted at rest
  - Never log or expose API keys
  - Rotate keys regularly

- [ ] **Session Management**
  - Sessions expire automatically
  - Logout clears all session data
  - Secure httpOnly cookies used

### 🌐 Network Security

- [ ] **SSL/TLS Configuration**
  - Enable HTTPS in production
  - Use Let's Encrypt for free SSL certificates
  - Configure in `nginx/nginx.conf`

- [ ] **Firewall Rules**
  - Only expose ports 80 and 443
  - Block direct database access (port 5432)
  - Restrict access to PgAdmin in production

- [ ] **CORS Configuration**
  - Configure allowed origins
  - Limit to your domain(s) only
  - Set appropriate headers

---

## Operational Security Guidelines

### Data Privacy & Protection

**Local-First Architecture:**
- All analysis processing happens within your Docker container
- Klaviyo data is fetched and processed locally
- No external analytics or tracking
- Results stored only in your database

**API Key Encryption:**
- Klaviyo API keys encrypted with AES-256
- Encryption key stored in environment variables
- Keys never logged or exposed in responses
- Rotate encryption keys periodically

**Database Security:**
- Row-level security ensures users only see their data
- PostgreSQL runs in isolated Docker container
- Regular backups recommended
- Soft-delete for user accounts (30-day retention)

### User Account Security

**Password Best Practices:**
- Use unique passwords for each account
- Enable password managers for your team
- Change default admin credentials immediately
- Implement password rotation policies

**Multi-User Setup:**
- Create individual accounts for each team member
- Don't share Klaviyo API keys between accounts
- Review user access regularly
- Disable accounts when team members leave

**Session Security:**
- Sessions are secured with httpOnly cookies
- Automatic logout after inactivity
- Clear sessions on password change
- Monitor active sessions

### API & External Access

**Klaviyo API Security:**
- Use private API keys only (never public keys)
- Restrict API key permissions in Klaviyo dashboard
- Monitor API usage for anomalies
- Rotate keys if compromised

**Rate Limiting:**
- Authentication endpoints are rate-limited
- Protects against brute force attacks
- Analysis creation has reasonable limits
- Contact support if hitting legitimate limits

**Request Timeouts:**
- Analysis requests timeout after reasonable periods
- Prevents resource exhaustion
- Failed analyses are automatically cleaned up
- Retry failed analyses if needed

---

## Data Management

### Data Retention

**Default Retention Policies:**
- Completed analyses: Kept indefinitely (user can delete)
- Failed analyses: Automatically cleaned up after 7 days
- User accounts: Soft-deleted for 30 days before permanent removal
- Audit logs: Retained for 90 days

**Managing Your Data:**
- Export analyses as CSV or JSON before deletion
- Regularly clean up old analyses to save disk space
- Use the dashboard to review and delete unneeded data
- Contact support for bulk deletion needs

### Data Backup

**Recommended Backup Strategy:**

```bash
# Daily automated backups
docker-compose exec db pg_dump -U klaviyo_user klaviyo_analysis > backup-$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T db psql -U klaviyo_user klaviyo_analysis < backup-20241124.sql
```

**What to Back Up:**
- PostgreSQL database (includes all analyses and user data)
- `.env` file (securely, separate from database)
- Custom configurations

**Backup Best Practices:**
- Automate daily backups
- Store backups off-site or in cloud storage
- Encrypt backup files
- Test restoration regularly
- Keep at least 30 days of backups

### Database Security

**Row-Level Security (RLS):**
- Automatically enabled on user data
- Users cannot access other users' analyses
- Admin operations require elevated permissions
- Enforced at the database level

**SQL Injection Protection:**
- All queries use parameterization
- Input validation with Zod schemas
- No raw SQL in user inputs
- Prisma ORM provides additional protection

**Connection Security:**
- Database accessible only within Docker network
- No external exposure by default
- Strong passwords required
- Connection pooling prevents exhaustion

---

## Monitoring & Audit Logging

### Audit Log System

**Events Logged:**
- User signup, login, logout
- Password changes
- API key creation and updates
- Analysis creation and completion
- Failed authentication attempts
- Settings changes

**Viewing Audit Logs:**

```bash
# View recent audit logs
docker-compose exec db psql -U klaviyo_user klaviyo_analysis \
  -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;"

# Filter by user
docker-compose exec db psql -U klaviyo_user klaviyo_analysis \
  -c "SELECT * FROM audit_logs WHERE user_id = 'USER_ID_HERE';"
```

**Log Retention:**
- Audit logs retained for 90 days
- Critical security events flagged
- IP addresses hashed for privacy
- No sensitive data in logs

### Health Monitoring

**Health Check Endpoints:**

```bash
# Basic liveness check
curl http://localhost:3000/api/health

# Should return: {"status":"ok"}
```

**Container Health:**

```bash
# Check all services
docker-compose ps

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f db

# Monitor resource usage
docker stats
```

**Database Monitoring:**

```bash
# Connect to database
docker-compose exec db psql -U klaviyo_user klaviyo_analysis

# Check database size
SELECT pg_size_pretty(pg_database_size('klaviyo_analysis'));

# Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Incident Response

### Common Security Scenarios

**Scenario: Suspected Unauthorized Access**

1. **Immediate Actions:**
   ```bash
   # Check audit logs for suspicious activity
   docker-compose exec db psql -U klaviyo_user klaviyo_analysis \
     -c "SELECT * FROM audit_logs WHERE action LIKE '%failed%' ORDER BY created_at DESC LIMIT 50;"
   
   # Review recent logins
   docker-compose exec db psql -U klaviyo_user klaviyo_analysis \
     -c "SELECT * FROM audit_logs WHERE action = 'login' ORDER BY created_at DESC LIMIT 20;"
   ```

2. **Investigation:**
   - Check for multiple failed login attempts
   - Look for unusual IP addresses
   - Review analysis creation patterns
   - Check for API key changes

3. **Response:**
   - Reset affected user passwords
   - Rotate Klaviyo API keys if compromised
   - Review and update access controls
   - Document incident in audit log

**Scenario: API Key Compromise**

1. **Immediate Actions:**
   - Revoke compromised key in Klaviyo dashboard
   - Generate new API key
   - Update in application settings
   - Review recent API usage in Klaviyo

2. **Investigation:**
   - Check audit logs for unusual exports
   - Review analysis history
   - Identify scope of data access
   - Determine how key was compromised

3. **Prevention:**
   - Educate users on key security
   - Implement key rotation schedule
   - Review access logs regularly
   - Consider additional authentication layers

**Scenario: Database Breach Attempt**

1. **Detection Signs:**
   - Unusual database queries in logs
   - High CPU or memory usage
   - Connection attempts from unknown sources
   - Failed authentication to database

2. **Response:**
   - Immediately change database passwords
   - Review firewall rules
   - Check for SQL injection attempts in logs
   - Restore from known-good backup if needed

3. **Recovery:**
   - Audit all user accounts
   - Review and update security policies
   - Implement additional monitoring
   - Document lessons learned

---

## Performance & Optimization

### Database Performance

**Current Optimizations:**
- Indexed columns for fast queries
- Connection pooling configured
- Query optimization with Prisma ORM
- Efficient data retrieval patterns

**Monitoring Performance:**

```bash
# Check slow queries
docker-compose exec db psql -U klaviyo_user klaviyo_analysis \
  -c "SELECT query, calls, total_time, mean_time 
      FROM pg_stat_statements 
      ORDER BY mean_time DESC LIMIT 10;"

# Monitor active connections
docker-compose exec db psql -U klaviyo_user klaviyo_analysis \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

**Optimization Tips:**
- Regularly vacuum and analyze tables
- Review and clean up old analyses
- Monitor disk space usage
- Consider upgrading resources for large datasets

### Analysis Performance

**Best Practices:**
- Limit date ranges to necessary periods
- Use appropriate cohort groupings
- Export large results for offline analysis
- Monitor analysis completion times

**Large Dataset Handling:**
- Analyses process in the background
- Progress tracked in real-time
- Failed analyses automatically retry
- Results paginated for large cohorts

### Troubleshooting Slow Performance

**Symptoms:**
- Slow page loads
- Analysis timeouts
- Database connection errors
- High memory usage

**Solutions:**

```bash
# Check Docker resource limits
docker stats

# Increase memory allocation in docker-compose.yml
services:
  web:
    mem_limit: 2g
  db:
    mem_limit: 1g

# Clear old data
docker-compose exec db psql -U klaviyo_user klaviyo_analysis \
  -c "DELETE FROM analyses WHERE status = 'failed' AND created_at < NOW() - INTERVAL '7 days';"

# Restart services
docker-compose restart
```

---

## Security Best Practices Summary

### Daily Operations

- **Regular Updates**: Keep Docker images and dependencies up to date
- **Backup Verification**: Test backup restoration monthly
- **Log Review**: Check audit logs weekly for anomalies
- **Resource Monitoring**: Monitor disk space and memory usage
- **Access Review**: Audit user accounts and permissions quarterly

### Security Checklist for Production

- [ ] All secrets in `.env` (not hardcoded)
- [ ] Strong passwords for all accounts
- [ ] SSL/TLS enabled
- [ ] Firewall configured properly
- [ ] Backups automated and tested
- [ ] Audit logging enabled
- [ ] Resource limits configured
- [ ] Updates scheduled regularly

### Compliance Considerations

**Data Privacy:**
- User data never leaves your infrastructure
- API keys encrypted at rest
- Minimal data retention by default
- Right to delete (user can remove all their data)
- Audit trail for data access

**GDPR Considerations (if applicable):**
- Users control their own data
- Data export available (CSV/JSON)
- Account deletion permanently removes data after 30 days
- Audit logs track all data access
- No third-party data sharing

### Security Update Policy

**Monitoring for Updates:**
- Subscribe to security advisories for all dependencies
- Regular npm audit runs
- Docker image security scanning
- Monitor Klaviyo API changes

**Update Procedure:**

```bash
# Check for updates
cd frontend
npm audit

# Update dependencies
npm update

# Rebuild containers
cd ..
docker-compose down
docker-compose up --build -d

# Verify everything works
docker-compose logs -f web
```

---

## Getting Help

### Support Resources

- **Documentation**: See [README.md](./README.md) for full documentation
- **Quick Start**: [QUICK_START.md](./QUICK_START.md) for setup help
- **Deployment**: [DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md) for architecture details

### Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email security concerns directly to project maintainers
3. Include detailed information about the vulnerability
4. Allow time for patches before public disclosure

### Community Support

- Open GitHub issues for bugs and feature requests
- Check existing documentation first
- Provide detailed error messages and logs
- Include system information and Docker versions

---

*Document maintained by: Project Team*  
*Last updated: November 24, 2024*  
*Version: 2.0 - Operational Guide*

