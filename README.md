# Klaviyo Analysis Suite

This is a suite of Klaviyo reporting tools which can be run locally as a Docker container, or on a hosted website. The primary intention is for you to run the Docker containers locally to preserve your data security - no need to share API keys or customer data with any third parties. The code is completely open-source and inspectable so you understand what transactions are being done, what data is being handled, and the safety of the operations. 

You can probably just point an LLM-enabled IDE at the project directory and ask it to configure the .env file and start the server, or follow the guide in [WEBAPP_DEPLOYMENT_SUMMARY.md](./WEBAPP_DEPLOYMENT_SUMMARY.md) for details.

## Directory Structure

```
klaviyo-analysis/
├── frontend/                   # Next.js web application
│   ├── src/
│   │   ├── app/               # Next.js 14 App Router
│   │   │   ├── (dashboard)/   # Protected dashboard routes
│   │   │   │   ├── analysis/  # Cohort analysis pages
│   │   │   │   ├── shipping-analysis/  # Shipping speed analysis
│   │   │   │   ├── dashboard/ # Main dashboard
│   │   │   │   └── settings/  # User settings
│   │   │   ├── api/           # API routes
│   │   │   │   ├── analysis/  # Analysis endpoints
│   │   │   │   ├── shipping-analysis/  # Shipping endpoints
│   │   │   │   ├── auth/      # Authentication
│   │   │   │   └── metrics/   # Klaviyo metrics
│   │   │   └── auth/          # Auth pages
│   │   ├── components/        # React components
│   │   │   ├── Charts/        # Data visualizations
│   │   │   └── ui/            # UI components
│   │   ├── services/          # Business logic
│   │   │   ├── analysis.service.ts  # Cohort analysis
│   │   │   ├── shipping-analysis.service.ts  # Shipping analysis
│   │   │   └── klaviyo.service.ts  # Klaviyo API client
│   │   ├── lib/               # Utilities
│   │   │   ├── auth.ts        # NextAuth configuration
│   │   │   ├── prisma.ts      # Database client
│   │   │   └── encryption.ts  # API key encryption
│   │   └── types/             # TypeScript definitions
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── package.json
├── database/                   # PostgreSQL setup
│   ├── init.sql               # Database initialization
│   └── migrations/            # Schema migrations
├── nginx/
│   └── nginx.conf             # Reverse proxy config
├── docker-compose.yml         # Development environment
├── docker-compose.prod.yml    # Production environment
└── Dockerfile                 # Container configuration
```

## Core Components

### Web Application (`frontend/`)

The application is built with **Next.js 14**, **TypeScript**, and **PostgreSQL**, designed to run in Docker containers for maximum security and portability.

#### Analysis Services

- **`analysis.service.ts`** - Cohort Analysis Engine
  - Processes subscription-to-order conversion analysis
  - Matches subscribers to their first order
  - Calculates statistics (mean, median, std dev, percentiles)
  - Generates weekly cohort data with conversion rates
  - Supports flexible metric selection (any event → any conversion event)

- **`shipping-analysis.service.ts`** - Shipping Speed Impact Analysis
  - Analyzes how delivery speed affects repeat purchase behavior
  - Builds customer timelines with all orders and fulfillment events
  - Calculates delivery quartiles (fast/medium/slow/very slow)
  - Generates weekly cohorts showing repeat purchase rates by delivery speed
  - Tracks 30/60/90-day repeat purchase percentages

- **`klaviyo.service.ts`** - Klaviyo API Client
  - Handles all Klaviyo API communication
  - Automatic pagination for large datasets
  - Event fetching with date filtering
  - Metric discovery and validation
  - Profile lookup and management

#### Authentication & Security

- **NextAuth.js** - Secure authentication with credentials and OAuth support
- **Encrypted API Keys** - User Klaviyo API keys are encrypted at rest using AES-256
- **Row-Level Security** - PostgreSQL RLS ensures users only see their own data
- **Rate Limiting** - API endpoint protection against abuse
- **Audit Logging** - All sensitive operations are logged for security

#### Database Schema

- **Users** - Authentication and profile management
- **Analyses** - Saved analysis results with parameters and data
- **API Keys** - Encrypted storage of user Klaviyo credentials
- **Audit Logs** - Security event tracking

#### API Routes

- `/api/analysis` - Create and retrieve cohort analyses
- `/api/shipping-analysis` - Create shipping speed analyses
- `/api/metrics` - Fetch available Klaviyo metrics for account
- `/api/auth` - Authentication endpoints (signin, signup)
- `/api/health` - Container health checks

### Docker Environment

- **Web Container** - Next.js application (Node.js Alpine)
- **Database** - PostgreSQL 15 with persistent volumes
- **PgAdmin** - Web-based database management (development only)
- **Nginx** - Reverse proxy and SSL termination (production)

## Features

-  **Secure & Private** - Your data never leaves your Docker container
-  **Interactive Dashboards** - Real-time statistics and visualizations
-  **Cohort Charts** - Visual analysis of conversion trends over time
-  **Flexible Metrics** - Use any Klaviyo events for your analysis
-  **Analysis History** - Save and compare multiple analyses
-  **Export Options** - Download results as CSV or JSON
-  **Docker Ready** - One-command deployment

## Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp env.example .env

# Edit .env with your settings
# - Set a secure NEXTAUTH_SECRET
# - Configure database credentials
# - Set NEXTAUTH_URL to your domain or http://localhost:3000
```

### 2. Start the Application

```bash
# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f web
```

### 3. Access the Application

- **Web App**: http://localhost:3000
- **PgAdmin**: http://localhost:5050 (admin@admin.com / admin)

### 4. Create an Account

1. Navigate to http://localhost:3000
2. Click "Sign Up" and create your account. Since you should be hosting this locally, this is really just for sharing with internal users on a VPN, and having an association to the data generated. There are not strict user security rules or permissions. 
3. Add your Klaviyo API key in Settings
4. Start creating analyses!

## Analysis Types

### Cohort Analysis (Subscription → Order)

Tracks how customers repeat metrics or different metrics over time:

- **Configurable Metrics**: Choose any start event and conversion event
- **Weekly Cohorts**: Groups subscribers by sign-up week
- **Conversion Tracking**: Percentage of each cohort that converts
- **Time-to-Convert**: Days from subscription to first order
- **Statistical Analysis**: Mean, median, percentiles, standard deviation
- **Visual Charts**: Conversion rate trends and cohort performance

**Common Use Cases**:
- Newsletter subscription → First purchase
- Free trial start → Paid subscription
- Account creation → First order
- Webinar attendance → Product purchase

### Shipping Speed Impact Analysis

Analyzes how delivery speed affects repeat purchase behavior:
Uses Wonderment metrics with Shopify data to understand the connection of shipping speed to retention on first customers. 
- **Delivery Speed Quartiles**: Automatic categorization (fast/medium/slow/very slow)
- **Repeat Purchase Tracking**: 30/60/90-day repeat rates
- **Cohort Aggregation**: Weekly performance by shipping method
- **Customer Segmentation**: Compare fast vs. slow delivery customers
- **Order Timeline**: Complete customer journey with all orders

**Key Insights**:
- Does faster shipping lead to more repeat purchases?
- Which shipping methods have the best repeat rates?
- How quickly do customers in each speed quartile reorder?
- What percentage of fast-delivery customers become repeat buyers?

## Notes

- **First Events Only**: Multiple subscriptions per profile use only the **first** subscription
- **Post-Event Orders**: Only orders **after** subscription are counted
- **Time Calculations**: All time differences calculated in **days** (rounded)
- **Data Privacy**: All processing happens locally in your Docker container
- **API Key Security**: Klaviyo API keys are encrypted and never transmitted in plaintext

## Production Deployment

### 📚 Deployment Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get started in minutes
- **[WEBAPP_DEPLOYMENT_SUMMARY.md](./WEBAPP_DEPLOYMENT_SUMMARY.md)** - Complete overview and quick reference
- **[DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md)** - Comprehensive deployment guide
- **[SECURITY_SAFETY_PLAN.md](./SECURITY_SAFETY_PLAN.md)** - Security best practices


### 🏗️ Architecture

```
Next.js 14 + TypeScript
    ↓
PostgreSQL (persistent data)
    ↓
Docker + Nginx + SSL
```

## 🧪 Legacy CLI Scripts

The `scripts/` and `src/` directories contain the original CLI analysis tools that preceded the web application. These are maintained for backward compatibility but are no longer the primary interface.

### Legacy Files

- `src/runSubscriptionToOrderAnalysis.ts` - Original analysis engine
- `scripts/` - Various analysis scripts for direct Klaviyo API interaction

These scripts require direct Klaviyo API access and manual configuration. **We recommend using the web application instead** for:
- Better security (encrypted API key storage)
- User-friendly interface
- Analysis history and comparison
- Visual charts and exports

---

## 📞 Support

- **Setup Issues**: See [QUICK_START.md](./QUICK_START.md)
- **Deployment Help**: Refer to [WEBAPP_DEPLOYMENT_SUMMARY.md](./WEBAPP_DEPLOYMENT_SUMMARY.md)
- **Security Questions**: Check [SECURITY_SAFETY_PLAN.md](./SECURITY_SAFETY_PLAN.md)
- **Bug Reports**: Open a GitHub issue
- **Feature Requests**: Open a GitHub discussion

---

## 📄 License

See [LICENSE](./LICENSE) file for details.

