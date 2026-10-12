# PDSChain v2 — Development Guide

## 1. Environment Setup

### Copy `.env.example` to `.env`

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**Bash / Zsh:**

```bash
cp .env.example .env
```

In `.env`, ensure `POSTGRES_PASSWORD` matches the password in `DATABASE_URL`. For local development:

```ini
POSTGRES_USER=pdschain
POSTGRES_PASSWORD=pdschain_local_dev
POSTGRES_DB=pdschain_v2
DATABASE_URL=postgresql://pdschain:pdschain_local_dev@127.0.0.1:5432/pdschain_v2?schema=public
```

---

## 2. Managing Local PostgreSQL

### Option A: Native Local PostgreSQL Server (Windows without Docker)

```powershell
# Start PostgreSQL 16 and ensure database pdschain_v2 exists
npm run db:start

# Check status via environment doctor
npm run doctor

# Stop PostgreSQL 16 cleanly
npm run db:stop
```

### Option B: Docker Compose (when Docker Desktop / Engine is installed)

```powershell
# Start PostgreSQL 16 container in background
docker compose up -d

# Check container health
docker compose ps

# Stop container (preserving named volume pdschain_v2_pgdata)
docker compose stop
```

---

## 3. Prisma Client & Database Migrations

```powershell
# Generate Prisma Client types
npm run db:generate

# Apply version-controlled migrations to PostgreSQL
npm run db:migrate

# Check migration status
npm run db:status
```

---

## 4. Running Services in Development

### Start API and Web Concurrently

```powershell
npm run dev
```

- **Backend API**: `http://127.0.0.1:4000/api/v1`
  - Liveness: `http://127.0.0.1:4000/api/v1/health/live`
  - Readiness: `http://127.0.0.1:4000/api/v1/health/ready`
  - Summary: `http://127.0.0.1:4000/api/v1/health`
- **Frontend Web App**: `http://localhost:5173`

### Start Workspaces Individually

```powershell
# Terminal 1 — Backend API
npm run dev --workspace=@pdschain/api

# Terminal 2 — Frontend Web App
npm run dev --workspace=@pdschain/web
```

---

## 5. Smart Contract Development (`packages/contracts`)

```powershell
# Compile Solidity contracts and generate TypeChain bindings
npm run contracts:compile

# Run Hardhat unit & state-interaction tests
npm run contracts:test

# Deploy FoundationSmokeAnchor to local Hardhat network and verify receipt
npm run contracts:deploy:local
```

---

## 6. Quality Gate Commands

Before committing or opening a pull request, run the full Phase 1 quality gate:

```powershell
npm run doctor
npm run format:check
npm run lint
npm run typecheck
npm run build
npm test
npm run test:contracts
npm run test:e2e
```
