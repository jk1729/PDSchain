import { execSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

function checkPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function parseMajor(versionString) {
  const clean = versionString.replace(/^v/, '').trim();
  return Number(clean.split('.')[0]);
}

async function runDoctor() {
  const checks = [];
  const record = (name, passed, detail) => {
    checks.push({ name, passed, detail });
  };

  // 1. Node.js version
  const nodeVersion = process.version;
  const nodeMajor = parseMajor(nodeVersion);
  record('Node.js Runtime (>=20)', nodeMajor >= 20, `Detected ${nodeVersion}`);

  // 2. npm version
  let npmVersion = 'unknown';
  try {
    npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  } catch {
    npmVersion = 'unknown';
  }
  record('npm Package Manager (>=10)', parseMajor(npmVersion) >= 10, `Detected v${npmVersion}`);

  // 3. Git repository & secret hygiene
  const gitRes = spawnSync('git', ['--version'], { encoding: 'utf-8' });
  const gitOk = gitRes.status === 0;
  record('Git CLI', gitOk, gitOk ? gitRes.stdout.trim() : 'git not found');

  const envExampleExists = fs.existsSync(path.join(rootDir, '.env.example'));
  record('.env.example Template', envExampleExists, envExampleExists ? 'Present' : 'Missing');

  const trackedEnvRes = spawnSync('git', ['ls-files', '.env'], {
    cwd: rootDir,
    encoding: 'utf-8',
  });
  const isEnvTracked = Boolean(trackedEnvRes.stdout && trackedEnvRes.stdout.trim().length > 0);
  record(
    'Secret Hygiene (.env untracked)',
    !isEnvTracked,
    isEnvTracked ? '.env is tracked!' : '.env is excluded from Git',
  );

  // 4. Required Environment Variables (never print secret values)
  const requiredVars = [
    'NODE_ENV',
    'API_HOST',
    'API_PORT',
    'VITE_API_BASE_URL',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'DATABASE_URL',
  ];
  const missingVars = requiredVars.filter(
    (key) => !process.env[key] || String(process.env[key]).trim() === '',
  );
  record(
    'Required Environment Variables',
    missingVars.length === 0,
    missingVars.length === 0
      ? `All ${requiredVars.length} required variables configured (values redacted)`
      : `Missing variables: ${missingVars.join(', ')}`,
  );

  const dbUrl = process.env.DATABASE_URL ?? '';
  const validPgProtocol = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
  record(
    'DATABASE_URL Protocol Check',
    validPgProtocol,
    validPgProtocol
      ? 'PostgreSQL protocol verified (credentials redacted)'
      : 'Invalid or non-PostgreSQL DATABASE_URL',
  );

  // 5. Workspace structure check
  const requiredPaths = [
    'apps/api/package.json',
    'apps/web/package.json',
    'packages/contracts/package.json',
    'prisma/schema.prisma',
    'compose.yaml',
  ];
  const missingPaths = requiredPaths.filter((rel) => !fs.existsSync(path.join(rootDir, rel)));
  record(
    'Monorepo Workspace Layout',
    missingPaths.length === 0,
    missingPaths.length === 0
      ? 'All workspace packages & schemas present'
      : `Missing: ${missingPaths.join(', ')}`,
  );

  // 6. PostgreSQL service connectivity (auto-start local cluster if initialized)
  const pgHost = process.env.POSTGRES_HOST ?? '127.0.0.1';
  const pgPort = Number(process.env.POSTGRES_PORT ?? 5432);
  let pgReachable = await checkPort(pgHost, pgPort);
  if (
    !pgReachable &&
    fs.existsSync(path.join(rootDir, '.postgres-data', 'cluster', 'PG_VERSION'))
  ) {
    spawnSync(process.execPath, [path.join(rootDir, 'scripts', 'db-server.mjs'), 'start'], {
      cwd: rootDir,
      stdio: 'ignore',
    });
    pgReachable = await checkPort(pgHost, pgPort);
  }
  record(
    'PostgreSQL Service Connectivity',
    pgReachable,
    pgReachable
      ? `Listening at ${pgHost}:${pgPort}`
      : `Not reachable at ${pgHost}:${pgPort} (run "npm run db:start" or "docker compose up -d")`,
  );

  console.log('\n=== PDSChain v2 — Phase 1 Environment & Configuration Doctor ===\n');
  for (const item of checks) {
    const badge = item.passed ? '[PASS]' : '[FAIL]';
    console.log(`${badge.padEnd(8)} ${item.name.padEnd(36)} ${item.detail}`);
  }

  const failed = ChecksFailed(checks);
  console.log('\n----------------------------------------------------------------');
  if (failed.length > 0) {
    console.error(`Doctor detected ${failed.length} issue(s). Review the [FAIL] items above.`);
    process.exit(1);
  } else {
    console.log(`All ${checks.length} doctor checks passed.`);
  }
}

function ChecksFailed(checks) {
  return checks.filter((c) => !c.passed);
}

await runDoctor();
