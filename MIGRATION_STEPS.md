# Migration Steps: CLI to Web Application

This document outlines the step-by-step process to migrate the existing Klaviyo analysis scripts into a full-featured web application.

## Overview

**Current State:** TypeScript CLI scripts that analyze Klaviyo subscription-to-order data  
**Target State:** Dockerized web application with dashboard, authentication, and API  
**Estimated Time:** 6-8 weeks for MVP

---

## Phase 1: Foundation (Week 1-2)

### Step 1.1: Project Setup

```bash
# Create new branch for webapp development
git checkout -b webapp-development

# Initialize Next.js frontend
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git

# Install core dependencies
cd frontend
npm install \
  next-auth \
  @prisma/client \
  bcryptjs \
  ioredis \
  recharts \
  date-fns \
  zod \
  axios \
  @tanstack/react-query

npm install -D \
  @types/bcryptjs \
  prisma
```

### Step 1.2: Database Setup

```bash
# Initialize Prisma
cd frontend
npx prisma init

# Copy the database schema
# Use the schema from database/init.sql as reference
# or create Prisma schema
```

**Create `prisma/schema.prisma`:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                      String     @id @default(uuid())
  email                   String     @unique
  passwordHash            String     @map("password_hash")
  name                    String?
  klaviyoApiKeyEncrypted  String?    @map("klaviyo_api_key_encrypted")
  klaviyoAccountId        String?    @map("klaviyo_account_id")
  timezone                String     @default("UTC")
  defaultCohortPeriod     String     @default("week") @map("default_cohort_period")
  emailVerified           Boolean    @default(false) @map("email_verified")
  isActive                Boolean    @default(true) @map("is_active")
  role                    String     @default("user")
  createdAt               DateTime   @default(now()) @map("created_at")
  updatedAt               DateTime   @updatedAt @map("updated_at")
  lastLoginAt             DateTime?  @map("last_login_at")
  
  analyses                Analysis[]
  apiKeys                 ApiKey[]
  scheduledAnalyses       ScheduledAnalysis[]
  
  @@map("users")
}

model Analysis {
  id                String              @id @default(uuid())
  userId            String              @map("user_id")
  name              String
  description       String?
  status            String              @default("pending")
  params            Json                @default("{}")
  results           Json?
  errorMessage      String?             @map("error_message")
  errorStack        String?             @map("error_stack")
  executionTimeMs   Int?                @map("execution_time_ms")
  eventsProcessed   Int?                @map("events_processed")
  createdAt         DateTime            @default(now()) @map("created_at")
  startedAt         DateTime?           @map("started_at")
  completedAt       DateTime?           @map("completed_at")
  
  user              User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  profiles          AnalysisProfile[]
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("analyses")
}

model AnalysisProfile {
  id                  String    @id @default(uuid())
  analysisId          String    @map("analysis_id")
  profileId           String    @map("profile_id")
  email               String?
  subscriptionDate    DateTime  @map("subscription_date")
  firstOrderDate      DateTime? @map("first_order_date")
  daysToFirstOrder    Int?      @map("days_to_first_order")
  metadata            Json      @default("{}")
  createdAt           DateTime  @default(now()) @map("created_at")
  
  analysis            Analysis  @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  
  @@index([analysisId])
  @@index([profileId])
  @@map("analysis_profiles")
}

model ApiKey {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  name            String
  keyEncrypted    String    @map("key_encrypted")
  keyPrefix       String?   @map("key_prefix")
  scopes          String[]
  lastUsedAt      DateTime? @map("last_used_at")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  expiresAt       DateTime? @map("expires_at")
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("api_keys")
}

model ScheduledAnalysis {
  id                  String    @id @default(uuid())
  userId              String    @map("user_id")
  name                String
  cronExpression      String    @map("cron_expression")
  params              Json      @default("{}")
  notifyOnCompletion  Boolean   @default(true) @map("notify_on_completion")
  notificationEmail   String?   @map("notification_email")
  isActive            Boolean   @default(true) @map("is_active")
  lastRunAt           DateTime? @map("last_run_at")
  nextRunAt           DateTime? @map("next_run_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([nextRunAt])
  @@map("scheduled_analyses")
}
```

```bash
# Generate Prisma client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init
```

### Step 1.3: Authentication Setup

**Create `frontend/src/lib/auth.ts`:**

```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  }
}
```

**Create `frontend/src/app/api/auth/[...nextauth]/route.ts`:**

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

---

## Phase 2: Core Services (Week 3-4)

### Step 2.1: Migrate Analysis Logic

**Create `frontend/src/services/analysis.service.ts`:**

```typescript
// Copy and refactor code from src/runSubscriptionToOrderAnalysis.ts
import { ProfileData, Statistics, CohortDataPoint } from '@/types/analysis'

export class AnalysisService {
  processSubscriptionEvents(events: any[]): Map<string, Date> {
    // Implementation from src/runSubscriptionToOrderAnalysis.ts
  }

  processOrderEvents(events: any[]): Map<string, Date> {
    // Implementation from src/runSubscriptionToOrderAnalysis.ts
  }

  matchSubscriptionsToOrders(
    subscriptions: Map<string, Date>,
    orders: Map<string, Date>
  ): ProfileData[] {
    // Implementation from src/runSubscriptionToOrderAnalysis.ts
  }

  calculateStatistics(profiles: ProfileData[]): Statistics {
    // Implementation from src/runSubscriptionToOrderAnalysis.ts
  }

  generateCohortData(profiles: ProfileData[]): CohortDataPoint[] {
    // Implementation from src/runSubscriptionToOrderAnalysis.ts
  }

  async runAnalysis(
    subscriptionEvents: any[],
    orderEvents: any[]
  ) {
    const subscriptions = this.processSubscriptionEvents(subscriptionEvents)
    const orders = this.processOrderEvents(orderEvents)
    const profiles = this.matchSubscriptionsToOrders(subscriptions, orders)
    const statistics = this.calculateStatistics(profiles)
    const cohortData = this.generateCohortData(profiles)

    return { statistics, cohortData, profiles }
  }
}
```

### Step 2.2: Klaviyo Service

**Create `frontend/src/services/klaviyo.service.ts`:**

```typescript
import { CacheService } from './cache.service'
import { extractCursor } from '@/lib/utils'

export class KlaviyoService {
  private apiKey: string
  private baseUrl: string
  private cache: CacheService

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = process.env.KLAVIYO_API_BASE_URL || 'https://a.klaviyo.com/api'
    this.cache = new CacheService()
  }

  async getMetrics() {
    return this.cache.get('klaviyo:metrics', async () => {
      const response = await fetch(`${this.baseUrl}/metrics`, {
        headers: {
          'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
          'revision': '2024-10-15'
        }
      })
      return response.json()
    }, 3600)
  }

  async getEvents(metricId: string, filters: any[] = []) {
    // Implementation using src/utils.ts fetchAllEvents
  }

  async getAllEventsWithPagination(metricId: string) {
    const allEvents: any[] = []
    let pageCursor: string | null = null
    let pageCount = 0

    do {
      console.log(`Fetching events, page ${++pageCount}...`)
      const response = await this.getEvents(metricId, [], pageCursor)
      
      if (response.data) {
        allEvents.push(...response.data)
      }
      
      pageCursor = extractCursor(response.links?.next || null)
      
      if (pageCursor) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } while (pageCursor)

    return allEvents
  }
}
```

### Step 2.3: API Routes

**Create `frontend/src/app/api/analysis/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnalysisService } from '@/services/analysis.service'
import { KlaviyoService } from '@/services/klaviyo.service'

// POST /api/analysis - Create new analysis
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, description, dateRange, filters } = await request.json()

  // Create analysis record
  const analysis = await prisma.analysis.create({
    data: {
      userId: session.user.id,
      name,
      description,
      status: 'pending',
      params: { dateRange, filters }
    }
  })

  // Run analysis in background (or await if you want synchronous)
  runAnalysisBackground(analysis.id, session.user.id)

  return NextResponse.json({ success: true, analysisId: analysis.id })
}

// GET /api/analysis - List user's analyses
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const analyses = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return NextResponse.json({ analyses })
}

async function runAnalysisBackground(analysisId: string, userId: string) {
  // This should ideally be a background job
  // For now, we'll run it directly
  // TODO: Use Bull queue or similar
}
```

---

## Phase 3: Frontend (Week 5-6)

### Step 3.1: Create Layout Components

### Step 3.2: Build Dashboard

### Step 3.3: Create Analysis Forms

### Step 3.4: Add Charts and Visualizations

---

## Phase 4: Testing & Deployment (Week 7-8)

### Step 4.1: Write Tests

### Step 4.2: Deploy to Staging

### Step 4.3: Production Deployment

---

## Detailed Checklist

- [ ] **Phase 1: Foundation**
  - [ ] Next.js project setup
  - [ ] Database schema with Prisma
  - [ ] Authentication with NextAuth.js
  - [ ] Environment configuration
  
- [ ] **Phase 2: Core Services**
  - [ ] Port analysis logic to services
  - [ ] Klaviyo API integration
  - [ ] Redis caching setup
  - [ ] API routes creation
  
- [ ] **Phase 3: Frontend**
  - [ ] Landing page
  - [ ] Authentication UI
  - [ ] Dashboard
  - [ ] Analysis creation flow
  - [ ] Results visualization
  - [ ] Export functionality
  
- [ ] **Phase 4: Docker & Deployment**
  - [ ] Dockerfile optimization
  - [ ] Docker Compose configuration
  - [ ] CI/CD pipeline
  - [ ] Production deployment
  
- [ ] **Phase 5: Polish**
  - [ ] Error handling
  - [ ] Loading states
  - [ ] Responsive design
  - [ ] Documentation
  - [ ] Security audit

---

## Success Criteria

✅ User can sign up and authenticate  
✅ User can securely store Klaviyo API key  
✅ User can run analysis with custom date ranges  
✅ Dashboard displays statistics and charts  
✅ Analysis completes within 30 seconds  
✅ Application is deployed and accessible  
✅ Data is persisted in PostgreSQL  
✅ Docker deployment works smoothly  

---

## Next Steps

1. Review this migration plan
2. Start with Phase 1: Foundation
3. Set up local development environment
4. Begin implementation following the checklist
5. Test incrementally as you build

**Need help?** Refer to:
- [DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md) for architecture details
- [QUICK_START.md](./QUICK_START.md) for getting started
- Existing code in `src/` directory for logic reference

