# Klaviyo Analysis Suite - Application Overview

## 📋 What This Is

A production-ready web application for analyzing Klaviyo data with powerful cohort analysis and shipping speed impact reports. Built with Docker for security and portability, all processing happens locally to protect your data.

---

## 📁 Project Structure

### Core Application

| Directory | Purpose |
|-----------|---------|
| `frontend/src/app` | Next.js application with dashboard, analysis pages, and API routes |
| `frontend/src/services` | Business logic for cohort and shipping analyses |
| `frontend/src/components` | Reusable UI components and charts |
| `database/` | PostgreSQL schema and migrations |
| `nginx/` | Reverse proxy configuration |

### Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development environment setup |
| `docker-compose.prod.yml` | Production environment with backups |
| `Dockerfile` | Multi-stage build for Next.js app |
| `env.example` | Template for environment variables |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `QUICK_START.md` | Getting started guide |
| `SECURITY_SAFETY_PLAN.md` | Security best practices |
| `DEPLOYMENT_PLAN.md` | Detailed architecture documentation |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   NGINX (Port 80/443)                       │
│  - SSL Termination                                          │
│  - Rate Limiting                                            │
│  - Reverse Proxy                                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS WEB APP (Port 3000)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Frontend (React + TypeScript)                      │   │
│  │  - Dashboard                                        │   │
│  │  - Analysis Views                                   │   │
│  │  - Charts (Recharts)                                │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Backend (API Routes)                               │   │
│  │  - Authentication (NextAuth.js)                     │   │
│  │  - Analysis API                                     │   │
│  │  - Klaviyo Integration                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Services                                           │   │
│  │  - AnalysisService (your existing logic)           │   │
│  │  - KlaviyoService (API wrapper)                    │   │
│  │  - CacheService (Redis)                            │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             ▼                      ▼
┌─────────────────────┐   ┌─────────────────────┐
│   PostgreSQL DB     │   │      Redis          │
│   - Users           │   │   - Cache           │
│   - Analyses        │   │   - Sessions        │
│   - Results         │   │                     │
└─────────────────────┘   └─────────────────────┘
             │
             ▼
┌─────────────────────┐
│   Klaviyo API       │
│   - Events          │
│   - Metrics         │
└─────────────────────┘
```

---

## 🚀 Quick Start Commands

### Development (Local with Docker)

```bash
# 1. Start all services
docker-compose up -d

# 2. View logs
docker-compose logs -f web

# 3. Access the app
open http://localhost:3000

# 4. Access PgAdmin
open http://localhost:5050
# Login: admin@klaviyo-analysis.local / admin

# 5. Stop services
docker-compose down
```

### Production Deployment

```bash
# 1. Set up environment variables
cp .env.example .env
nano .env  # Edit with production values

# 2. Deploy with production config
docker-compose -f docker-compose.prod.yml up -d

# 3. View status
docker-compose -f docker-compose.prod.yml ps

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f

# 5. Run database migrations (if using Prisma)
docker-compose -f docker-compose.prod.yml exec web npm run db:migrate
```

---

## ✨ Features

### Analysis Capabilities

- **Cohort Analysis**: Track how any event leads to another event
  - Flexible metric selection (any start → any conversion event)
  - Weekly cohort grouping with conversion rates
  - Statistical analysis (mean, median, percentiles)
  - Visual charts and data export
  - Common use: Subscription → First Purchase

- **Shipping Speed Analysis**: Analyze delivery speed impact on retention
  - Automatic delivery speed quartiles
  - 30/60/90-day repeat purchase tracking
  - Weekly cohort aggregation by shipping method
  - Customer lifetime order timelines
  - Uses Wonderment + Shopify data

### User Interface

- **Dashboard**: Overview of all analyses with quick stats
- **Interactive Charts**: Visual analysis with Recharts
- **Data Export**: Download results as CSV or JSON
- **Analysis History**: Save and compare multiple analyses
- **Responsive Design**: Works on desktop, tablet, and mobile

### Security & Privacy

- **Local Processing**: All data stays in your Docker container
- **Encrypted Storage**: Klaviyo API keys encrypted with AES-256
- **User Authentication**: Secure sign up/sign in with NextAuth.js
- **Row-Level Security**: PostgreSQL RLS ensures data isolation
- **Audit Logging**: Track all security-sensitive operations

---

## 💾 Database Schema

### Main Tables

```
users
├── id (UUID)
├── email (unique)
├── password_hash
├── klaviyo_api_key_encrypted
└── ... (timestamps, preferences)

analyses
├── id (UUID)
├── user_id (FK → users)
├── name
├── status (pending/running/completed/failed)
├── params (JSON)
├── results (JSON)
└── ... (timestamps, metrics)

analysis_profiles
├── id (UUID)
├── analysis_id (FK → analyses)
├── profile_id
├── subscription_date
├── first_order_date
├── days_to_first_order
└── ...

api_keys
├── id (UUID)
├── user_id (FK → users)
├── key_encrypted
└── ...

scheduled_analyses (for recurring analyses)
├── id (UUID)
├── user_id (FK → users)
├── cron_expression
└── ...
```

---

## 🏗️ Technical Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Auth**: NextAuth.js

### Backend
- **Runtime**: Node.js 20 (Alpine Linux)
- **API**: Next.js API Routes
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: NextAuth.js with credentials provider

### Infrastructure
- **Containers**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (production)
- **Database Admin**: PgAdmin (development)

---

## 💰 Cost Estimates

### Self-Hosted (Recommended for Start)

**DigitalOcean Droplet**
- 4GB RAM, 2 vCPU, 80GB SSD
- **$24/month**

**Managed Redis** (optional)
- 1GB RAM
- **$15/month**

**Domain + SSL**
- Domain: **$12/year**
- SSL (Let's Encrypt): **Free**

**Total: ~$40/month**

### Alternative: Platform-as-a-Service

**Vercel (Frontend)**
- Free tier: $0/month
- Pro tier: $20/month

**Railway/Render (Backend + DB)**
- Database: $7-15/month
- Backend: $7-20/month

**Total: ~$20-50/month**

---

## 🔒 Security Features

1. **Authentication**
   - Bcrypt password hashing (10+ rounds)
   - JWT with short expiration
   - httpOnly cookies for tokens

2. **API Security**
   - Rate limiting (100 req/minute per user)
   - CORS configuration
   - Input validation and sanitization
   - SQL injection prevention (Prisma ORM)

3. **Data Protection**
   - AES-256 encryption for Klaviyo API keys
   - Environment variables for secrets
   - No logging of sensitive data

4. **Network Security**
   - SSL/TLS encryption
   - Security headers (HSTS, X-Frame-Options, etc.)
   - Nginx reverse proxy

---

## 📈 Performance Optimizations

1. **Caching**
   - Klaviyo metrics: 1 hour TTL
   - Klaviyo events: 5 minutes TTL
   - Analysis results: 24 hours TTL

2. **Database**
   - Indexes on frequently queried columns
   - Partial indexes for filtered queries
   - Connection pooling

3. **Frontend**
   - Static asset caching (1 year)
   - Code splitting
   - Lazy loading components
   - Image optimization

4. **API**
   - Cursor-based pagination
   - Response compression (gzip)
   - Background job processing

---

## 🧪 Testing Strategy

### Unit Tests
```bash
# Run unit tests
npm run test

# With coverage
npm run test:coverage
```

### Integration Tests
```bash
# Test API endpoints
npm run test:integration
```

### E2E Tests
```bash
# Playwright/Cypress
npm run test:e2e
```

### Load Tests
```bash
# k6 load testing
k6 run tests/load/analysis.js
```

---

## 📚 Documentation Structure

```
docs/
├── api/
│   ├── authentication.md
│   ├── analysis.md
│   └── klaviyo.md
├── deployment/
│   ├── docker.md
│   ├── production.md
│   └── troubleshooting.md
├── development/
│   ├── setup.md
│   ├── architecture.md
│   └── contributing.md
└── user-guide/
    ├── getting-started.md
    ├── running-analysis.md
    └── understanding-results.md
```

---

## 🎓 Technology Stack

### Frontend
- **Framework**: Next.js 14+ (React 18+)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **State**: React Query (TanStack Query)

### Backend
- **Runtime**: Node.js 20
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Cache**: Redis 7
- **Auth**: NextAuth.js

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (optional)

---

## 🔧 Environment Variables Required

```bash
# Application
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-with-openssl>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# Encryption (for Klaviyo API keys)
ENCRYPTION_KEY=<generate-with-openssl>

# Optional
SENTRY_DSN=<your-sentry-dsn>
SMTP_HOST=smtp.gmail.com
SMTP_USER=<your-email>
SMTP_PASSWORD=<your-password>
```

---

## 🚦 Next Steps

### Immediate Actions

1. **Review the plan**: Read through `DEPLOYMENT_PLAN.md`
2. **Choose deployment method**: Docker Compose or Platform-as-a-Service?
3. **Set up development environment**: Follow `QUICK_START.md`
4. **Start implementation**: Use `MIGRATION_STEPS.md` as a guide

### Development Order

```
1. Set up local environment with Docker
   ↓
2. Initialize Next.js project
   ↓
3. Set up database with Prisma
   ↓
4. Implement authentication
   ↓
5. Port analysis logic to services
   ↓
6. Create API endpoints
   ↓
7. Build frontend components
   ↓
8. Test everything locally
   ↓
9. Deploy to staging
   ↓
10. Production deployment
```

---

## 📞 Support & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Docker Docs](https://docs.docker.com)

### Tutorials Referenced in Plan
- Full authentication setup with NextAuth.js
- Prisma schema design patterns
- Docker multi-stage builds
- Nginx configuration for Node.js apps

### Your Existing Code
- `src/runSubscriptionToOrderAnalysis.ts` - Core analysis logic
- `src/utils.ts` - Klaviyo API utilities
- `scripts/*` - Various analysis scripts

All of this logic will be migrated to the new services architecture.

---

## 🚀 Deployment Options

### Local Development/Testing

Perfect for secure data analysis on your own machine:

```bash
docker-compose up -d
open http://localhost:3000
```

- No external hosting needed
- Complete data privacy
- Quick setup

### Self-Hosted Production

Deploy to your own VPS for team access:

**Recommended Providers:**
- DigitalOcean (~$40/month)
- Linode
- Hetzner
- AWS EC2

**Includes:**
- SSL/TLS encryption
- Nginx reverse proxy
- Automated backups
- Production database

### Platform-as-a-Service

Deploy frontend and database separately:

**Options:**
- Frontend: Vercel, Netlify, Railway
- Database: Railway, Supabase, Neon
- Cost: ~$20-50/month

---

## 🎉 Summary

The Klaviyo Analysis Suite is a **production-ready web application** that provides:

- **Secure Local Processing**: Your data never leaves your Docker container
- **Two Powerful Analysis Types**: Cohort analysis and shipping speed impact
- **Flexible Metrics**: Use any Klaviyo events for your analyses
- **Beautiful Visualizations**: Interactive charts and exportable data
- **Easy Deployment**: One command to start with Docker
- **Enterprise Security**: Encrypted storage, authentication, audit logging

**Setup Time**: 10-15 minutes  
**Hosting Cost**: Free (local) or $20-50/month (hosted)  
**Data Privacy**: 100% local processing

---

## 🙋 Getting Started

1. **Read** [QUICK_START.md](./QUICK_START.md) for setup instructions
2. **Configure** your `.env` file with secure secrets
3. **Start** with `docker-compose up -d`
4. **Access** at http://localhost:3000
5. **Create** your first analysis!

For deployment guidance, see [DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md).  
For security best practices, see [SECURITY_SAFETY_PLAN.md](./SECURITY_SAFETY_PLAN.md).

