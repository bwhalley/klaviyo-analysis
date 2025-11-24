# Quick Start Guide

This guide will help you quickly get started with the Klaviyo Analysis Suite web application.

## Prerequisites

- Docker & Docker Compose installed
- A Klaviyo account with API access
- (Optional) Node.js 20+ for local development without Docker

## Quick Start with Docker (Recommended)

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

### Step 4: Create Your Account

1. Open http://localhost:3000 in your browser
2. Click "Sign Up" to create your account
3. Navigate to Settings and add your Klaviyo API key
4. Start creating analyses!

### Step 5: Database Management (Optional)

```bash
# Connect to database via PgAdmin at http://localhost:5050
# Or connect directly via terminal
docker-compose exec db psql -U klaviyo_user -d klaviyo_analysis
```

---

## Local Development (Without Docker)

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

### Step 3: Install Dependencies (if modifying code)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run in development mode
npm run dev
```

---

## Using the Application

### Creating a Cohort Analysis

1. Navigate to **New Analysis** from the dashboard
2. Select your start metric (e.g., "Subscribed to List")
3. Select your conversion metric (e.g., "Placed Order")
4. Choose a date range
5. Click "Start Analysis"
6. View results with statistics, charts, and exportable data

### Creating a Shipping Speed Analysis

1. Navigate to **New Shipping Analysis** from the dashboard
2. Select your date range for first-time customers
3. Click "Start Analysis"
4. View how delivery speed impacts repeat purchases
5. Export results as CSV or JSON

### Managing Your Account

- **Settings**: Update your Klaviyo API key
- **Dashboard**: View all your analyses
- **Export**: Download analysis results in CSV or JSON format

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

**Issue: Web app won't start**
```bash
# Check logs for errors
docker-compose logs -f web

# Rebuild containers
docker-compose down
docker-compose up --build
```

**Issue: Can't access the application**
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Check if containers are running
docker-compose ps

# Restart all services
docker-compose restart
```

**Issue: Klaviyo API errors**
- Verify your API key in Settings is correct
- Check that your Klaviyo account has the necessary permissions
- Ensure the metrics you're trying to analyze exist in your account

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Recharts](https://recharts.org/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Klaviyo API Reference](https://developers.klaviyo.com/en/reference/api-overview)

