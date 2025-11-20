# Klaviyo Subscription to First Order Analysis

This directory contains scripts and tools for analyzing how long it takes new email subscribers (identified by "Subscribed to List" events) to place their first order.

> **🚀 NEW: Web Application Deployment Available!**  
> This project can now be deployed as a full-featured web application with dashboard, authentication, and sharing capabilities.  
> See [WEBAPP_DEPLOYMENT_SUMMARY.md](./WEBAPP_DEPLOYMENT_SUMMARY.md) for details.

## Directory Structure

```
klaviyo-analysis/
├── src/                    # Core analysis functions
│   ├── runSubscriptionToOrderAnalysis.ts
│   └── utils.ts            # Utility functions and constants
├── scripts/                # Runnable analysis scripts
│   ├── runComplete2025Analysis.ts
│   ├── runAnalysisNow.ts
│   ├── run2025Analysis.ts
│   ├── analyze2025Subscriptions.ts
│   ├── fetchAndAnalyze2025.ts
│   ├── final2025Analysis.ts
│   ├── process2025Data.ts
│   ├── processCompleteAnalysis.ts
│   └── quickAnalysis.ts
└── docs/                  # Documentation and results
    ├── 2025_ANALYSIS_RESULTS.md
    ├── ANALYSIS_RESULTS.md
    ├── ANALYSIS_SUMMARY.md
    └── COMPLETE_2025_ANALYSIS.md
```

## Core Components

### Source Files (`src/`)

- **`runSubscriptionToOrderAnalysis.ts`** - Core analysis engine
  - Processes subscription and order events
  - Matches subscribers to their first order
  - Calculates statistics (mean, median, std dev, percentiles)
  - Generates cohort data

- **`utils.ts`** - Utility functions and constants
  - Metric IDs (Subscribed to List, Placed Order)
  - Pagination helpers (extract cursor, fetch all events)

### Scripts (`scripts/`)

- **`runComplete2025Analysis.ts`** - Main analysis script for 2025 subscribers
- **`runAnalysisNow.ts`** - Ready-to-run analysis script
- **`run2025Analysis.ts`** - Pagination and fetching utilities
- **`analyze2025Subscriptions.ts`** - Analysis template for 2025
- **`fetchAndAnalyze2025.ts`** - Fetching functions with pagination
- **`final2025Analysis.ts`** - Final analysis implementation
- **`process2025Data.ts`** - Data processing utilities
- **`processCompleteAnalysis.ts`** - Complete analysis processing
- **`quickAnalysis.ts`** - Quick analysis script

### Documentation (`docs/`)

- **`2025_ANALYSIS_RESULTS.md`** - Complete results from 2025 analysis
- **`ANALYSIS_RESULTS.md`** - Analysis results summary
- **`ANALYSIS_SUMMARY.md`** - Summary of analysis approach
- **`COMPLETE_2025_ANALYSIS.md`** - Complete analysis documentation

## Usage

### Running the 2025 Analysis

```typescript
import { runComplete2025Analysis } from './scripts/runComplete2025Analysis'

// Fetch all order events with pagination
const allOrderEvents = await fetchAllOrders()

// Run analysis
const result = await runComplete2025Analysis(allOrderEvents)
```

### Using the Core Analysis Function

```typescript
import { analyzeSubscriptionToOrder } from './src/runSubscriptionToOrderAnalysis'

const result = await analyzeSubscriptionToOrder(
  subscriptionEvents,
  orderEvents
)
```

## Analysis Features

The analysis provides:

- **Statistics**:
  - Total subscribers
  - Subscribers with orders
  - Conversion rate
  - Mean days to first order
  - Median days to first order
  - Standard deviation
  - Percentiles (P25, P75, P90, P95)

- **Cohort Data**:
  - Grouped by subscription week
  - Conversion rates per cohort
  - Average days to order per cohort

- **Individual Results**:
  - Subscription date for each subscriber
  - First order date (if any)
  - Days from subscription to first order

## Notes

- Only counts orders that occurred **after** subscription
- Multiple subscriptions per profile: Only the **first** subscription is used
- Multiple orders per profile: Only the **first** order is used
- Time difference is calculated in **days** (rounded to nearest day)

## Requirements

- Klaviyo MCP server configured
- Access to Klaviyo API events
- Metric IDs:
  - "Subscribed to List": `UfyMVA`
  - "Placed Order": `UhZHSf`

---

## 🌐 Web Application Deployment

Transform these CLI scripts into a shareable web application! We've prepared a complete deployment package:

### 📚 Documentation

- **[WEBAPP_DEPLOYMENT_SUMMARY.md](./WEBAPP_DEPLOYMENT_SUMMARY.md)** - Complete overview and quick reference
- **[DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md)** - Comprehensive 60+ page deployment guide
- **[QUICK_START.md](./QUICK_START.md)** - Get started in minutes
- **[MIGRATION_STEPS.md](./MIGRATION_STEPS.md)** - Detailed phase-by-phase migration guide

### 🚀 Quick Deploy

```bash
# Start development environment with Docker
docker-compose up -d

# Access the application
open http://localhost:3000

# View PgAdmin (database management)
open http://localhost:5050
```

### ✨ Web App Features

- 🔐 **User Authentication** - Secure sign up/sign in
- 📊 **Interactive Dashboard** - Statistics and visualizations
- 📈 **Cohort Charts** - Visual analysis of conversion trends
- 🔄 **Background Processing** - Handle large datasets
- 💾 **Analysis History** - Save and compare results
- 📤 **Export Options** - CSV, JSON, PDF exports
- 🔒 **Secure API Key Storage** - Encrypted Klaviyo credentials
- 🐳 **Docker Deployment** - One-command deployment

### 🏗️ Architecture

```
Next.js 14 + TypeScript
    ↓
PostgreSQL (data) + Redis (cache)
    ↓
Docker + Nginx + SSL
    ↓
Production-Ready!
```

### 💰 Cost Estimate

**Self-Hosted**: ~$40/month (DigitalOcean, includes database, redis, SSL)  
**Platform-as-a-Service**: ~$20-50/month (Vercel + Railway/Render)

### ⏱️ Development Time

**MVP**: 6-8 weeks  
**Production-Ready**: 8-10 weeks

### 📖 Getting Started

1. Read [WEBAPP_DEPLOYMENT_SUMMARY.md](./WEBAPP_DEPLOYMENT_SUMMARY.md) for an overview
2. Follow [QUICK_START.md](./QUICK_START.md) to set up your environment
3. Use [MIGRATION_STEPS.md](./MIGRATION_STEPS.md) for detailed implementation

### 📁 Key Files

```
klaviyo-analysis/
├── WEBAPP_DEPLOYMENT_SUMMARY.md   # Start here!
├── DEPLOYMENT_PLAN.md             # Complete architecture
├── QUICK_START.md                 # Getting started guide
├── MIGRATION_STEPS.md             # Implementation checklist
├── docker-compose.yml             # Development environment
├── docker-compose.prod.yml        # Production environment
├── Dockerfile                     # Container configuration
├── database/init.sql              # Database schema
└── nginx/nginx.conf              # Reverse proxy config
```

---

## 📞 Support

- **CLI Usage**: See documentation above
- **Web App Deployment**: Refer to [WEBAPP_DEPLOYMENT_SUMMARY.md](./WEBAPP_DEPLOYMENT_SUMMARY.md)
- **Issues**: Open a GitHub issue
- **Questions**: Check the deployment documentation

