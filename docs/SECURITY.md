# PDSChain v2 — Security Policy & Secret Hygiene

## 1. Secret & Credential Management

- **Zero Secrets in Git**: `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key`, `*.secret`, and `packages/contracts/deployments/local.json` are excluded via `.gitignore`.
- **Startup Validation**: Both `@pdschain/api` (`validateApiEnv`) and `@pdschain/contracts` (`validateExternalDeploymentEnv`) validate configuration schemas using Zod before execution.
- **Redacted Diagnostics**: `npm run doctor` and `/api/v1/health` verify configuration presence and database connectivity without printing passwords, connection strings, or private keys.

## 2. Wallet & Blockchain Security

- Never commit real wallet private keys, MetaMask seed phrases, or production RPC API keys to the repository.
- Local development uses Hardhat's deterministic ephemeral test accounts on chain ID `31337`.
- External network deployments (Phase 3+) require `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` to be injected strictly via untracked environment variables at runtime.

## 3. Database & Data Privacy Security

- **Local Binding Only**: Both `compose.yaml` (`127.0.0.1:${POSTGRES_PORT:-5432}:5432`) and `scripts/db-server.mjs` (`-h 127.0.0.1`) bind PostgreSQL strictly to the loopback interface (`127.0.0.1`).
- **No Real Beneficiary PII**: Never store real citizen Aadhaar numbers, ration card identifiers, phone numbers, or personal data in development databases, seed scripts, or test fixtures.
- **Safe Error Envelopes**: `AllExceptionsFilter` and `PrismaService.probeDatabase()` strip internal stack traces and Prisma connection URLs from HTTP error responses.

## 4. API Transport & CORS Controls

- CORS origins are explicitly configured via `CORS_ALLOWED_ORIGINS`.
- Wildcard (`*`) origins are programmatically rejected by `validateApiEnv` when `NODE_ENV=production`.
- Request payloads are validated using NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` to prevent mass-assignment vulnerabilities.
