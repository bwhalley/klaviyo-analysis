# Quick Start Guide: Migrating to Web App

This guide will help you quickly get started with transforming the Klaviyo analysis scripts into a web application.

## Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ (for local development without Docker)
- Git
- A Klaviyo account with API access

## Option 1: Quick Start with Docker (Recommended)

### Step 1: Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Generate a secure NEXTAUTH_SECRET
openssl rand -base64 32

# Generate an ENCRYPTION_KEY
openssl rand -hex 32

# Edit .env and add these values
nano .env
```

### Step 2: Start the Application

```bash
# Start all services (web app, database, redis, pgadmin)
docker-compose up -d

# View logs
docker-compose logs -f web

# Check status
docker-compose ps
```

### Step 3: Access the Application

- **Web App:** http://localhost:3000
- **PgAdmin:** http://localhost:5050 (admin@klaviyo-analysis.local / admin)
- **Database:** localhost:5432
- **Redis:** localhost:6379

### Step 4: Initialize Database

```bash
# Run migrations (if using Prisma/TypeORM)
docker-compose exec web npm run db:migrate

# Or connect to database directly
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis
```

---

## Option 2: Local Development (Without Docker)

### Step 1: Install Dependencies

```bash
# Install PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Install Redis
brew install redis
brew services start redis

# Create database
psql postgres -c "CREATE DATABASE klaviyo_analysis;"
psql postgres -c "CREATE USER klaviyo_user WITH PASSWORD 'klaviyo_pass';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE klaviyo_analysis TO klaviyo_user;"
```

### Step 2: Initialize Database Schema

```bash
# Run the initialization script
psql -U klaviyo_user -d klaviyo_analysis -f database/init.sql
```

### Step 3: Set Up Frontend

```bash
# Create Next.js application
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd frontend
npm install

# Install additional dependencies
npm install \
  next-auth \
  @prisma/client \
  bcryptjs \
  redis \
  recharts \
  date-fns \
  zod \
  axios
```

### Step 4: Set Up Backend

```bash
# Create backend directory structure
mkdir -p backend/src/{api,services,models,utils}

cd backend
npm init -y

# Install dependencies
npm install \
  express \
  typescript \
  @types/node \
  @types/express \
  dotenv \
  cors \
  helmet \
  express-rate-limit \
  pg \
  ioredis \
  bcryptjs \
  jsonwebtoken
```

### Step 5: Run Development Servers

```bash
# Terminal 1: Frontend
cd frontend
npm run dev

# Terminal 2: Backend (if separate)
cd backend
npm run dev
```

---

## Project Structure Setup

### Migrate Existing Analysis Logic

```bash
# Create services directory
mkdir -p frontend/src/services

# Copy and refactor existing analysis logic
cp src/runSubscriptionToOrderAnalysis.ts frontend/src/services/analysis.service.ts
cp src/utils.ts frontend/src/services/klaviyo.service.ts
```

### Create API Routes (Next.js App Router)

```bash
mkdir -p frontend/src/app/api/{auth,analysis,klaviyo}

# Create route handlers
touch frontend/src/app/api/auth/[...nextauth]/route.ts
touch frontend/src/app/api/analysis/route.ts
touch frontend/src/app/api/klaviyo/metrics/route.ts
```

### Create Frontend Components

```bash
mkdir -p frontend/src/components/{Dashboard,Analysis,Layout,Charts}

# Create component files
touch frontend/src/components/Dashboard/StatisticsCards.tsx
touch frontend/src/components/Charts/CohortChart.tsx
touch frontend/src/components/Analysis/AnalysisForm.tsx
```

---

## Implementation Checklist

### Phase 1: Backend Foundation ✅
- [ ] Set up database schema (use `database/init.sql`)
- [ ] Create user authentication API
  - [ ] Sign up endpoint
  - [ ] Sign in endpoint
  - [ ] JWT token generation
- [ ] Create Klaviyo service
  - [ ] API key validation
  - [ ] Fetch metrics
  - [ ] Fetch events with pagination
- [ ] Implement Redis caching

### Phase 2: Core Analysis Features ✅
- [ ] Port analysis logic to service layer
  - [ ] `processSubscriptionEvents()`
  - [ ] `processOrderEvents()`
  - [ ] `matchSubscriptionsToOrders()`
  - [ ] `calculateStatistics()`
  - [ ] `generateCohortData()`
- [ ] Create analysis API endpoints
  - [ ] `POST /api/analysis` - Create analysis
  - [ ] `GET /api/analysis` - List analyses
  - [ ] `GET /api/analysis/:id` - Get analysis
- [ ] Add background job processing (optional)

### Phase 3: Frontend Development ✅
- [ ] Create landing page
- [ ] Implement authentication UI
  - [ ] Sign up form
  - [ ] Sign in form
  - [ ] Klaviyo API key setup
- [ ] Build dashboard
  - [ ] Statistics cards
  - [ ] Recent analyses list
  - [ ] Quick actions
- [ ] Create analysis flow
  - [ ] Analysis form (date range, filters)
  - [ ] Loading states
  - [ ] Results visualization
    - [ ] Cohort chart (Recharts)
    - [ ] Statistics cards
    - [ ] Profile data table
- [ ] Add export functionality (CSV/JSON)

### Phase 4: Polish & Deploy ✅
- [ ] Add error handling
- [ ] Implement rate limiting
- [ ] Set up logging (Winston)
- [ ] Security hardening
  - [ ] CSRF protection
  - [ ] XSS prevention
  - [ ] SQL injection prevention
- [ ] Write tests
- [ ] Create documentation
- [ ] Deploy to production

---

## Sample Code Snippets

### 1. Next.js API Route for Analysis

```typescript
// frontend/src/app/api/analysis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { analyzeSubscriptionToOrder } from '@/services/analysis.service'
import { KlaviyoService } from '@/services/klaviyo.service'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { name, dateRange, filters } = await request.json()

    // Initialize Klaviyo service
    const klaviyoService = new KlaviyoService(session.user.apiKey)

    // Fetch events
    const subscriptionEvents = await klaviyoService.getAllEvents('UfyMVA', dateRange)
    const orderEvents = await klaviyoService.getAllEvents('UhZHSf', dateRange)

    // Run analysis
    const results = await analyzeSubscriptionToOrder(subscriptionEvents, orderEvents)

    // Save to database
    const analysis = await db.analysis.create({
      data: {
        userId: session.user.id,
        name,
        params: { dateRange, filters },
        results,
        status: 'completed',
      },
    })

    return NextResponse.json({ success: true, data: analysis })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
```

### 2. Dashboard Component

```typescript
// frontend/src/components/Dashboard/StatisticsCards.tsx
import { Card } from '@/components/ui/card'
import { TrendingUp, Users, ShoppingCart, Clock } from 'lucide-react'

interface StatisticsCardsProps {
  statistics: {
    totalSubscribers: number
    subscribersWithOrder: number
    conversionRate: number
    medianDaysToFirstOrder: number
  }
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  const stats = [
    {
      label: 'Total Subscribers',
      value: statistics.totalSubscribers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
    },
    {
      label: 'Conversion Rate',
      value: `${statistics.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Orders Placed',
      value: statistics.subscribersWithOrder.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-purple-600',
    },
    {
      label: 'Median Days to Order',
      value: `${statistics.medianDaysToFirstOrder} days`,
      icon: Clock,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
            <stat.icon className={`w-12 h-12 ${stat.color}`} />
          </div>
        </Card>
      ))}
    </div>
  )
}
```

### 3. Cohort Chart Component

```typescript
// frontend/src/components/Charts/CohortChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CohortChartProps {
  data: Array<{
    cohortLabel: string
    conversionRate: number
    avgDaysToOrder: number
  }>
}

export function CohortChart({ data }: CohortChartProps) {
  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="cohortLabel" 
            angle={-45} 
            textAnchor="end" 
            height={100}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="conversionRate"
            stroke="#8884d8"
            name="Conversion Rate (%)"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgDaysToOrder"
            stroke="#82ca9d"
            name="Avg Days to Order"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## Testing the Application

### Manual Testing

1. **Start the app:** `docker-compose up`
2. **Create account:** Navigate to http://localhost:3000/signup
3. **Add Klaviyo API key:** Go to settings
4. **Run analysis:** Create new analysis with date range
5. **View results:** Check dashboard and analysis details

### Automated Testing

```bash
# Unit tests
npm run test

# E2E tests with Playwright
npm run test:e2e

# Load testing with k6
k6 run tests/load/analysis.js
```

---

## Deployment

### Deploy to DigitalOcean

```bash
# 1. Create a Droplet (Ubuntu 22.04)
# 2. SSH into the server
ssh root@your-server-ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 4. Clone your repository
git clone https://github.com/yourusername/klaviyo-analysis.git
cd klaviyo-analysis

# 5. Set up environment variables
cp .env.example .env
nano .env  # Edit with production values

# 6. Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 7. Set up SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Deploy to Vercel (Frontend only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard
```

---

## Troubleshooting

### Common Issues

**Issue: Database connection failed**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

**Issue: Redis connection failed**
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

**Issue: Klaviyo API rate limit**
```bash
# Increase delay between requests in utils.ts
await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay
```

**Issue: Out of memory during analysis**
```bash
# Increase Docker memory limit in docker-compose.yml
services:
  web:
    mem_limit: 2g
```

---

## Next Steps

1. **Start with Phase 1:** Set up the database and basic authentication
2. **Port Analysis Logic:** Move your existing analysis code to services
3. **Build API Endpoints:** Create REST API for analysis operations
4. **Create UI:** Build the dashboard and analysis views
5. **Deploy:** Use Docker Compose for easy deployment

Need help? Check the full [DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md) for detailed architecture and implementation guidance.

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Recharts](https://recharts.org/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Klaviyo API Reference](https://developers.klaviyo.com/en/reference/api-overview)

