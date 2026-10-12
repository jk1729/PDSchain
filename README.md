# PDSChain v2 — Blockchain-Supported Public Distribution System

PDSChain v2 is a traceable, blockchain-supported Public Distribution System (PDS) platform built as a strict TypeScript monorepo. It combines a React + Tailwind CSS web application, a NestJS REST API (`/api/v1`), a PostgreSQL relational database managed with Prisma ORM, and an Ethereum-compatible Hardhat smart-contract workspace.

> **Current Status:** **Phase 1 (Foundation, Architecture & Project Setup) — Complete.**
> Authentication, role-based access control, production PDS smart contracts, supply-chain registries, and ration issuance workflows are scheduled for Phases 2 through 7 (see [`docs/PHASES.md`](./docs/PHASES.md)).

---

## Technology Stack

| Layer                                      | Technology                                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Monorepo & Tooling**                     | npm Workspaces, TypeScript 5.7 (strict mode), ESLint 9, Prettier 3                                                |
| **Frontend (`apps/web`)**                  | React 18, Vite 6, Tailwind CSS 3.4, React Router 6, Lucide Icons, React Hook Form + Zod, Vitest + Testing Library |
| **Backend (`apps/api`)**                   | NestJS 11, Express, `class-validator` / `class-transformer`, Zod env validation, Jest + Supertest                 |
| **Database (`prisma/`)**                   | PostgreSQL 16, Prisma ORM 6, version-controlled SQL migrations                                                    |
| **Smart Contracts (`packages/contracts`)** | Solidity `0.8.24`, Hardhat 2.22, OpenZeppelin Contracts 5.2, Ethers.js v6, TypeChain                              |
| **End-to-End Testing (`tests/`)**          | Playwright (Chromium)                                                                                             |

---

## Repository Structure

```text
pdschain-v2/
├── apps/
│   ├── api/                 # NestJS REST API (/api/v1/health, /api/v1/health/live, /api/v1/health/ready)
│   └── web/                 # React + Vite + Tailwind CSS frontend application
├── packages/
│   └── contracts/           # Hardhat + Solidity 0.8.24 smart-contract workspace
├── prisma/
│   ├── schema.prisma        # PostgreSQL Prisma schema
│   └── migrations/          # Version-controlled PostgreSQL migrations
├── docs/
│   ├── ARCHITECTURE.md      # System architecture and component boundaries
│   ├── DEVELOPMENT.md       # Developer guide and verified PowerShell/POSIX commands
│   ├── SECURITY.md          # Secret management, database, and blockchain security policies
│   └── PHASES.md            # 7-phase implementation roadmap
├── scripts/
│   ├── db-server.mjs        # Local PostgreSQL 16 lifecycle script (start/stop/status)
│   ├── db-migrate.mjs       # Environment-aware Prisma migration runner
│   └── doctor.mjs           # Environment, tool, and service readiness diagnostic tool
├── tests/
│   └── smoke.spec.ts        # Playwright browser E2E smoke test suite
├── .github/workflows/ci.yml # GitHub Actions CI pipeline
├── compose.yaml             # Docker Compose configuration for local PostgreSQL 16
├── .env.example             # Documented environment variable template
└── package.json             # Root workspace scripts and shared devDependencies
```

---

## Prerequisites

- **Node.js**: `>= 20.0.0` (verified on Node.js `v24.20.0` and LTS `v22.x`)
- **npm**: `>= 10.0.0` (verified on npm `11.19.0`)
- **Git**: `>= 2.30`
- **PostgreSQL 16**:
  - Either via **Docker Compose** (`docker compose up -d`), **or**
  - Via the built-in native Windows PostgreSQL 16 server binary manager (`npm run db:start`) when Docker is not installed on the host.

---

## Quick Start & Installation

### 1. Clone / Enter the Workspace & Install Dependencies

```powershell
# Windows PowerShell / POSIX
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and review the local development settings:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# Bash / Zsh
cp .env.example .env
```

> **Note:** Ensure `POSTGRES_PASSWORD` and the password segment of `DATABASE_URL` match in `.env`. Never commit `.env` to Git.

### 3. Start PostgreSQL & Initialize Database Migrations

If Docker Desktop is installed and running:

```powershell
docker compose up -d
```

If Docker is not installed on your local Windows machine, start the local native PostgreSQL 16 server included in the workspace:

```powershell
npm run db:start
```

Then generate the Prisma Client and apply migrations:

```powershell
npm run db:generate
npm run db:migrate
npm run db:status
```

### 4. Run the Environment Doctor

```powershell
npm run doctor
```

### 5. Start the Development Services

Start both the NestJS API (`http://127.0.0.1:4000/api/v1`) and the React frontend (`http://localhost:5173`):

```powershell
npm run dev
```

Or start each workspace individually:

```powershell
npm run dev --workspace=@pdschain/api
npm run dev --workspace=@pdschain/web
```

---

## Root Commands Reference

| Command                          | Description                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run doctor`                 | Verifies Node/npm/Git versions, `.env` hygiene, required variables, and PostgreSQL connectivity                                                    |
| `npm run db:start`               | Starts the local PostgreSQL 16 instance and ensures the `pdschain_v2` database exists                                                              |
| `npm run db:stop`                | Cleanly stops the local PostgreSQL 16 instance                                                                                                     |
| `npm run db:generate`            | Generates Prisma Client from `prisma/schema.prisma`                                                                                                |
| `npm run db:migrate`             | Applies pending version-controlled migrations (`prisma migrate deploy`)                                                                            |
| `npm run db:status`              | Reports Prisma migration status against PostgreSQL                                                                                                 |
| `npm run dev`                    | Starts both `@pdschain/api` and `@pdschain/web` in watch mode                                                                                      |
| `npm run build`                  | Builds `@pdschain/api`, `@pdschain/web`, and compiles `@pdschain/contracts`                                                                        |
| `npm run lint`                   | Runs ESLint across all workspaces                                                                                                                  |
| `npm run typecheck`              | Runs strict TypeScript typechecking across all workspaces                                                                                          |
| `npm run format:check`           | Verifies code formatting with Prettier                                                                                                             |
| `npm test`                       | Runs backend (Jest + Supertest) and frontend (Vitest) test suites                                                                                  |
| `npm run test:contracts`         | Runs Hardhat smart-contract tests                                                                                                                  |
| `npm run contracts:compile`      | Compiles Solidity contracts and generates TypeChain types                                                                                          |
| `npm run contracts:test`         | Alias for `npm run test:contracts`                                                                                                                 |
| `npm run contracts:deploy:local` | Deploys `FoundationSmokeAnchor` to the local Hardhat network, executes a smoke transaction, and writes `packages/contracts/deployments/local.json` |
| `npm run test:e2e`               | Runs Playwright Chromium end-to-end browser smoke tests                                                                                            |

---

## Troubleshooting

- **`/api/v1/health/ready` returns HTTP 503 (`DEPENDENCY_UNAVAILABLE`)**:
  PostgreSQL is not running or `DATABASE_URL` credentials do not match the running instance. Run `npm run db:start` (or `docker compose up -d`) and verify with `npm run doctor`.
- **Port conflict on `4000`, `5173`, or `5432`**:
  Update `API_PORT`, `WEB_PORT`, `VITE_API_BASE_URL`, `POSTGRES_PORT`, and `DATABASE_URL` in `.env`.
- **Playwright browser missing**:
  Run `npx playwright install chromium` to download the Chromium browser binary.

---

## Scope & Phase 1 Boundaries

Implemented in Phase 1:

- Monorepo workspaces (`apps/web`, `apps/api`, `packages/contracts`, `prisma/`).
- React application shell, welcome page, service-status diagnostics console, reusable UI components, error boundary, and 404 handling.
- NestJS API under `/api/v1` with `/health`, `/health/live`, `/health/ready`, `/health/ping`, DTO validation, correlation IDs, structured request logging, and centralized exception handling.
- PostgreSQL 16 + Prisma ORM configuration and initial migration (`20261012000000_init_foundation`).
- Hardhat + Solidity `0.8.24` + OpenZeppelin workspace with `FoundationSmokeAnchor` smoke-test contract, automated tests, and local deployment script.
- Playwright E2E smoke test suite and GitHub Actions CI workflow.

Not yet implemented (scheduled for Phases 2–7):

- User authentication, JWT/session management, and RBAC (Phase 2).
- Production PDSChain smart contracts for inventory, transfers, and beneficiary distribution (Phase 3).
- Off-chain supply-chain entities, warehouses, fair price shops, and ration cards (Phases 4–6).
