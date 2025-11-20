# Klaviyo Analysis - Web Application Deployment Plan

## Executive Summary

Transform the current TypeScript CLI analysis tool into a **full-stack Dockerized web application** that allows users to:
- Connect their Klaviyo account securely
- Run subscription-to-order analysis with custom date ranges
- View interactive dashboards with statistics and cohort data
- Export results as CSV/JSON
- Share results with team members

---

## Architecture Overview

### **Stack Recommendation**

```
Frontend:  Next.js 14+ (React, TypeScript)
Backend:   Node.js + Express (or Next.js API Routes)
Database:  PostgreSQL (for storing analysis history & user data)
Cache:     Redis (for Klaviyo API response caching)
Auth:      NextAuth.js (OAuth + JWT)
Charting:  Recharts or Chart.js
Docker:    Multi-stage build with docker-compose
```

### **System Architecture**

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Next.js App   │  ← Frontend + API Routes
│  (Port 3000)    │
└────────┬────────┘
         │
    ┌────┴──────────────┐
    │                   │
    ▼                   ▼
┌─────────┐      ┌──────────────┐
│  Redis  │      │  PostgreSQL  │
│ (Cache) │      │  (Storage)   │
└─────────┘      └──────────────┘
         │
         ▼
    ┌─────────┐
    │ Klaviyo │
    │   API   │
    └─────────┘
```

---

## Phase 1: Application Structure Setup

### 1.1 Project Restructure

```
klaviyo-analysis-webapp/
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.worker (for background jobs)
│   └── nginx.conf (if needed for production)
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── analysis.ts
│   │   │   │   └── reports.ts
│   │   │   └── middleware/
│   │   │       ├── auth.ts
│   │   │       └── rateLimit.ts
│   │   ├── services/
│   │   │   ├── klaviyo.service.ts     # Klaviyo API wrapper
│   │   │   ├── analysis.service.ts    # Core analysis logic (from your current scripts)
│   │   │   └── cache.service.ts       # Redis caching
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   └── analysis.model.ts
│   │   └── utils/
│   │       ├── statistics.ts
│   │       └── cohort.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js 14 App Router
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx           # Main dashboard
│   │   │   ├── analysis/
│   │   │   │   ├── new/page.tsx       # Create new analysis
│   │   │   │   └── [id]/page.tsx      # View analysis results
│   │   │   └── api/                   # API routes (or use separate backend)
│   │   │       ├── auth/[...nextauth].ts
│   │   │       ├── analysis/route.ts
│   │   │       └── klaviyo/route.ts
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── StatisticsCards.tsx
│   │   │   │   ├── CohortChart.tsx
│   │   │   │   └── ConversionFunnel.tsx
│   │   │   ├── Analysis/
│   │   │   │   ├── AnalysisForm.tsx
│   │   │   │   └── ResultsTable.tsx
│   │   │   └── Layout/
│   │   │       ├── Header.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── analysis.types.ts
│   ├── public/
│   └── package.json
├── database/
│   ├── migrations/
│   └── seeds/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

### 1.2 Core Features to Implement

#### **Feature 1: Authentication & Authorization**
- Sign up / Sign in with email
- Klaviyo API key storage (encrypted at rest)
- OAuth integration (optional: allow Klaviyo OAuth)
- Session management
- Role-based access (Admin, Viewer)

#### **Feature 2: Analysis Dashboard**
- **Overview Cards:**
  - Total subscribers
  - Conversion rate
  - Average days to first order
  - Median days to first order
- **Charts:**
  - Cohort analysis (line/bar chart)
  - Distribution histogram (days to order)
  - Conversion funnel
  - Time series of subscriptions & orders
- **Filters:**
  - Date range selector
  - List/Segment selector (from Klaviyo)
  - Cohort period (day/week/month)

#### **Feature 3: Analysis Management**
- Create new analysis runs
- View past analysis results
- Export results (CSV, JSON, PDF)
- Schedule automated analysis (optional)
- Compare multiple analysis runs

#### **Feature 4: Klaviyo Integration**
- Validate Klaviyo API credentials
- Fetch events with pagination
- Cache responses (Redis)
- Handle rate limiting (429 errors)
- Retry logic with exponential backoff

---

## Phase 2: Backend Implementation

### 2.1 Core Services

#### **KlaviyoService** (`services/klaviyo.service.ts`)
```typescript
class KlaviyoService {
  async getMetrics(): Promise<Metric[]>
  async getEvents(metricId: string, filters: EventFilter[]): Promise<Event[]>
  async getAllEventsWithPagination(metricId: string): Promise<Event[]>
  async validateApiKey(apiKey: string): Promise<boolean>
}
```

#### **AnalysisService** (`services/analysis.service.ts`)
```typescript
class AnalysisService {
  async runAnalysis(params: AnalysisParams): Promise<AnalysisResult>
  async getAnalysisById(id: string): Promise<AnalysisResult>
  async listAnalyses(userId: string): Promise<AnalysisResult[]>
  async exportAnalysis(id: string, format: 'csv' | 'json'): Promise<Buffer>
}
```

### 2.2 API Endpoints

```typescript
POST   /api/auth/signup              # Create account
POST   /api/auth/signin              # Sign in
POST   /api/auth/signout             # Sign out
GET    /api/auth/me                  # Get current user

POST   /api/klaviyo/validate         # Validate API key
GET    /api/klaviyo/metrics          # Get available metrics
GET    /api/klaviyo/lists            # Get available lists/segments

POST   /api/analysis                 # Create new analysis
GET    /api/analysis                 # List user's analyses
GET    /api/analysis/:id             # Get specific analysis
DELETE /api/analysis/:id             # Delete analysis
GET    /api/analysis/:id/export      # Export analysis (CSV/JSON)

GET    /api/reports/statistics       # Get aggregated statistics
GET    /api/reports/cohorts          # Get cohort data
```

### 2.3 Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  klaviyo_api_key_encrypted TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analyses table
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  params JSONB NOT NULL,                -- Analysis parameters (date range, filters)
  results JSONB,                        -- Analysis results (statistics, cohort data)
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Analysis profiles table (for detailed results)
CREATE TABLE analysis_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  profile_id VARCHAR(255) NOT NULL,
  subscription_date TIMESTAMP NOT NULL,
  first_order_date TIMESTAMP,
  days_to_first_order INTEGER
);

CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analysis_profiles_analysis_id ON analysis_profiles(analysis_id);
```

---

## Phase 3: Frontend Implementation

### 3.1 Key Pages

#### **Landing Page** (`app/page.tsx`)
- Hero section with value proposition
- Feature highlights
- Call-to-action (Sign up / Try demo)

#### **Dashboard** (`app/dashboard/page.tsx`)
```typescript
// Features:
- Statistics overview cards
- Recent analyses list
- Quick action buttons (New Analysis, View Reports)
```

#### **New Analysis** (`app/analysis/new/page.tsx`)
```typescript
// Form fields:
- Analysis name
- Date range (start/end date)
- List/Segment filter (optional)
- Cohort period (day/week/month)
- Submit button → Triggers analysis, redirects to results
```

#### **Analysis Results** (`app/analysis/[id]/page.tsx`)
```typescript
// Displays:
- Statistics cards
- Cohort chart (Recharts line/bar chart)
- Distribution histogram
- Conversion funnel
- Export buttons (CSV, JSON, PDF)
- Profile data table (paginated)
```

### 3.2 Components

#### **StatisticsCards** Component
```typescript
interface Statistic {
  label: string
  value: string | number
  change?: number  // % change from previous
  icon: ReactNode
}

<StatsGrid>
  <StatCard 
    label="Total Subscribers" 
    value={1234} 
    icon={<UsersIcon />} 
  />
  <StatCard 
    label="Conversion Rate" 
    value="32.5%" 
    change={+5.2} 
    icon={<TrendingUpIcon />} 
  />
  ...
</StatsGrid>
```

#### **CohortChart** Component
```typescript
// Using Recharts
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={cohortData}>
    <XAxis dataKey="cohortLabel" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line 
      type="monotone" 
      dataKey="conversionRate" 
      stroke="#8884d8" 
    />
    <Line 
      type="monotone" 
      dataKey="avgDaysToOrder" 
      stroke="#82ca9d" 
    />
  </LineChart>
</ResponsiveContainer>
```

---

## Phase 4: Dockerization

### 4.1 Multi-Stage Dockerfile

#### **Dockerfile.web** (Next.js App)
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

#### **Dockerfile.worker** (Optional: Background Jobs)
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "dist/worker.js"]
```

### 4.2 Docker Compose Configuration

#### **docker-compose.yml** (Development)
```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@db:5432/klaviyo_analysis
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - db
      - redis
    command: npm run dev

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=klaviyo_analysis
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Optional: PgAdmin for database management
  pgadmin:
    image: dpage/pgadmin4
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@example.com
      - PGADMIN_DEFAULT_PASSWORD=admin
    ports:
      - "5050:80"
    depends_on:
      - db

volumes:
  postgres_data:
  redis_data:
```

#### **docker-compose.prod.yml** (Production)
```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
      target: runner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    restart: always
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always

  # Nginx reverse proxy (optional)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    restart: always

volumes:
  postgres_data:
  redis_data:
```

### 4.3 Environment Configuration

#### **.env.example**
```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@db:5432/klaviyo_analysis
POSTGRES_USER=user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=klaviyo_analysis

# Redis
REDIS_URL=redis://redis:6379

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key-here-change-in-production

# Klaviyo (default values, users provide their own)
KLAVIYO_API_BASE_URL=https://a.klaviyo.com/api

# Encryption (for storing Klaviyo API keys)
ENCRYPTION_KEY=your-32-char-encryption-key

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
```

---

## Phase 5: Security & Best Practices

### 5.1 Security Measures

1. **API Key Storage**
   - Encrypt Klaviyo API keys at rest using AES-256
   - Never log or expose API keys
   - Use environment variables for secrets

2. **Authentication**
   - Use bcrypt for password hashing (10+ rounds)
   - Implement JWT with short expiration (15 minutes)
   - Refresh tokens stored in httpOnly cookies
   - CSRF protection enabled

3. **Rate Limiting**
   - API rate limits per user (e.g., 100 req/minute)
   - Klaviyo API rate limit handling
   - Exponential backoff for retries

4. **Data Validation**
   - Input sanitization (XSS prevention)
   - SQL injection prevention (parameterized queries)
   - Request payload size limits

5. **CORS Configuration**
   - Whitelist allowed origins
   - Credentials: true for authenticated requests

### 5.2 Performance Optimization

1. **Caching Strategy**
   ```typescript
   // Cache Klaviyo metrics for 1 hour
   const metrics = await cacheService.get('klaviyo:metrics', async () => {
     return await klaviyoService.getMetrics()
   }, 3600)
   
   // Cache analysis results for 24 hours
   const results = await cacheService.get(`analysis:${id}`, async () => {
     return await analysisService.getResults(id)
   }, 86400)
   ```

2. **Database Indexing**
   - Index on `user_id`, `created_at`, `status`
   - Partial indexes for common queries

3. **Pagination**
   - Cursor-based pagination for large result sets
   - Limit: 50 items per page

4. **Background Jobs**
   - Use Bull queue for long-running analyses
   - Job status tracking
   - Webhook notifications on completion

---

## Phase 6: Deployment Strategy

### 6.1 Deployment Options

#### **Option 1: Self-Hosted (VPS)**
- **Providers:** DigitalOcean, Linode, AWS EC2
- **Steps:**
  1. Provision Ubuntu 22.04 server
  2. Install Docker & Docker Compose
  3. Clone repository
  4. Configure `.env` file
  5. Run: `docker-compose -f docker-compose.prod.yml up -d`
  6. Set up SSL with Let's Encrypt (Certbot)
  7. Configure domain DNS

#### **Option 2: Platform-as-a-Service**
- **Providers:** Vercel (frontend), Railway/Render (backend + DB)
- **Steps:**
  1. Deploy Next.js to Vercel
  2. Deploy PostgreSQL to Railway/Render
  3. Connect services via environment variables

#### **Option 3: Kubernetes**
- For larger scale deployments
- Helm charts for easier management
- Auto-scaling based on load

### 6.2 CI/CD Pipeline

#### **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          docker build -f docker/Dockerfile.web -t myapp/web:latest .
      
      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push myapp/web:latest
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app
            docker-compose pull
            docker-compose up -d
```

### 6.3 Monitoring & Logging

1. **Application Monitoring**
   - Sentry for error tracking
   - Prometheus + Grafana for metrics
   - Health check endpoint: `/api/health`

2. **Logging**
   - Winston for structured logging
   - Log aggregation (Loki or CloudWatch)
   - Request/response logging

3. **Alerts**
   - High error rate
   - Database connection failures
   - API rate limit exceeded

---

## Phase 7: Documentation

### 7.1 User Documentation

1. **Getting Started Guide**
   - How to create an account
   - How to add Klaviyo API key
   - Running your first analysis

2. **Feature Documentation**
   - Understanding statistics
   - Reading cohort charts
   - Exporting data

3. **FAQ**
   - Common issues
   - Klaviyo API permissions
   - Billing/usage questions

### 7.2 Developer Documentation

1. **Setup Instructions** (README.md)
   - Prerequisites
   - Installation steps
   - Running locally

2. **API Documentation**
   - Endpoint reference (Swagger/OpenAPI)
   - Authentication flow
   - Rate limits

3. **Architecture Documentation**
   - System design
   - Database schema
   - Service interactions

---

## Phase 8: Testing Strategy

### 8.1 Testing Layers

1. **Unit Tests** (Jest)
   - Service layer functions
   - Utility functions (statistics, cohorts)
   - 80%+ coverage target

2. **Integration Tests**
   - API endpoints
   - Database operations
   - Klaviyo service mocking

3. **E2E Tests** (Playwright/Cypress)
   - User authentication flow
   - Creating and viewing analysis
   - Dashboard interactions

4. **Load Testing** (k6)
   - API endpoint performance
   - Concurrent analysis runs
   - Database query performance

---

## Implementation Timeline

### **Week 1-2: Foundation**
- ✅ Set up project structure
- ✅ Implement authentication (NextAuth.js)
- ✅ Set up database (PostgreSQL + Prisma/TypeORM)
- ✅ Create basic API endpoints

### **Week 3-4: Core Features**
- ✅ Implement Klaviyo service integration
- ✅ Port analysis logic from current scripts
- ✅ Create analysis service with caching
- ✅ Build API endpoints for analysis

### **Week 5-6: Frontend**
- ✅ Build landing page
- ✅ Implement dashboard
- ✅ Create analysis form
- ✅ Build results visualization (charts)

### **Week 7: Dockerization**
- ✅ Create Dockerfiles
- ✅ Set up docker-compose
- ✅ Test local deployment
- ✅ Optimize build process

### **Week 8: Polish & Deploy**
- ✅ Security hardening
- ✅ Performance optimization
- ✅ Documentation
- ✅ Production deployment
- ✅ Monitoring setup

---

## Cost Estimation

### Self-Hosted on DigitalOcean (Recommended for start)

| Resource | Specs | Monthly Cost |
|----------|-------|--------------|
| Droplet (App + DB) | 4GB RAM, 2 vCPU | $24/month |
| Managed Redis | 1GB | $15/month |
| Domain | .com | $12/year |
| SSL Certificate | Let's Encrypt | Free |
| **Total** | | **~$40/month** |

### Alternatives

- **Vercel + Railway:** ~$20-50/month (free tiers available)
- **AWS (t3.medium):** ~$30-60/month
- **Heroku:** ~$50-100/month

---

## Next Steps

1. **Decision Points:**
   - Confirm tech stack preferences
   - Choose deployment platform
   - Decide on authentication method (email/password vs OAuth)

2. **Start Implementation:**
   ```bash
   # Clone current project
   cd klaviyo-analysis
   
   # Create new branch
   git checkout -b webapp-migration
   
   # Start with backend structure
   mkdir -p backend/{src,tests}
   mkdir -p frontend/{src,public}
   
   # Initialize Next.js
   npx create-next-app@latest frontend --typescript --tailwind --app
   
   # Initialize backend
   cd backend
   npm init -y
   npm install express typescript @types/node @types/express
   ```

3. **Migration Strategy:**
   - Keep existing scripts functional
   - Gradually move logic to services
   - Test thoroughly before removing old code

---

## Success Metrics

- **User Metrics:**
  - Time to first analysis: < 5 minutes
  - Dashboard load time: < 2 seconds
  - Analysis completion time: < 30 seconds (for typical dataset)

- **Technical Metrics:**
  - API response time: p95 < 500ms
  - Uptime: 99.9%
  - Error rate: < 0.1%

- **Business Metrics:**
  - User adoption rate
  - Daily active users
  - Analysis runs per user per week

---

## Conclusion

This plan transforms your current CLI tool into a production-ready web application. The architecture is:
- **Scalable:** Can handle multiple users and large datasets
- **Secure:** Implements industry-standard security practices
- **Maintainable:** Clean separation of concerns, well-documented
- **Shareable:** Easy to deploy and use by non-technical users

**Estimated Development Time:** 6-8 weeks for MVP, 2-3 weeks for production-ready
**Estimated Cost:** $40-100/month for hosting (starting small)

Ready to start implementation? Let me know which aspects you'd like to prioritize!

