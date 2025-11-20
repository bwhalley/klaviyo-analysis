# Quick Setup Guide

## First Time Setup

Follow these steps to get your Klaviyo Analysis web app running:

### 1. Generate Lock File (Required First!)

```bash
cd frontend
npm install
cd ..
```

This generates the `package-lock.json` file needed for Docker builds.

### 2. Configure Environment Variables

```bash
# Copy example
cp .env.example .env

# Generate secrets
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
```

Edit `.env` and add these values plus your database credentials.

### 3. Start Services with Docker

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f web
```

### 4. Initialize Database

```bash
# In a new terminal
cd frontend
npx prisma generate
npx prisma db push
```

### 5. Access the Application

Open http://localhost:3000

- **Web App:** http://localhost:3000
- **PgAdmin:** http://localhost:5050 (admin@klaviyo-analysis.local / admin)

---

## Quick Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart web

# Rebuild after code changes
docker-compose up -d --build web

# Check database
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis

# Check Redis
docker-compose exec redis redis-cli ping
```

---

## Troubleshooting

### "npm ci" error

**Problem:** Docker build fails with `npm ci` error

**Solution:** Run `npm install` in the frontend directory first:
```bash
cd frontend
npm install
cd ..
docker-compose up -d --build
```

### Database connection failed

**Problem:** Can't connect to database

**Solution:** Check if PostgreSQL is running:
```bash
docker-compose ps db
docker-compose logs db
```

### Port already in use

**Problem:** Port 3000, 5432, or 6379 already in use

**Solution:** Stop other services or change ports in `docker-compose.yml`

### Prisma errors

**Problem:** Prisma client errors

**Solution:** Regenerate Prisma client:
```bash
cd frontend
npx prisma generate
npx prisma db push
```

---

## Development Workflow

### Making Code Changes

1. Edit files in `frontend/src/`
2. Changes auto-reload (hot reload enabled)
3. No rebuild needed for most changes

### Updating Dependencies

```bash
cd frontend
npm install <package-name>
# Rebuild Docker image
cd ..
docker-compose up -d --build web
```

### Database Migrations

```bash
cd frontend
npx prisma migrate dev --name <migration_name>
```

### Viewing Database

```bash
# Option 1: Prisma Studio
cd frontend
npx prisma studio

# Option 2: PgAdmin
# Open http://localhost:5050
# Add server: db, port 5432, user klaviyo_user
```

---

## Production Deployment

```bash
# Use production config
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:3000/api/health
```

---

## Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes data!)
docker-compose down -v

# Remove all (containers, volumes, images)
docker-compose down -v --rmi all
```

---

## Success Checklist

- [ ] `npm install` completed in frontend directory
- [ ] `.env` file created with secrets
- [ ] `docker-compose up -d` running without errors
- [ ] Database initialized with Prisma
- [ ] Can access http://localhost:3000
- [ ] Can create an account
- [ ] Can add Klaviyo API key in settings
- [ ] Can run an analysis

---

## Need Help?

Check these files:
- **Full Deployment Guide:** [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md)
- **Quick Start:** [QUICK_START.md](QUICK_START.md)
- **Complete Features:** [MVP_COMPLETE.md](MVP_COMPLETE.md)

Or run:
```bash
# Check service health
docker-compose exec web curl http://localhost:3000/api/health

# Check logs for errors
docker-compose logs --tail=50 web
```

