import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const host = process.env.POSTGRES_HOST ?? '127.0.0.1';
const port = Number(process.env.POSTGRES_PORT ?? 5432);
const user = process.env.POSTGRES_USER ?? 'pdschain';
const password = process.env.POSTGRES_PASSWORD ?? 'pdschain_local_dev';

const dataRoot = path.join(rootDir, '.postgres-data');
const clusterDir = path.join(dataRoot, 'cluster');
const logFile = path.join(dataRoot, 'postgres.log');

function getEmbeddedBinDir() {
  const winBin = path.join(
    rootDir,
    'node_modules',
    '@embedded-postgres',
    'windows-x64',
    'native',
    'bin',
  );
  if (fs.existsSync(winBin)) {
    return winBin;
  }
  return null;
}

function resolvePgBinary(name) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const embeddedDir = getEmbeddedBinDir();
  if (embeddedDir) {
    const candidate = path.join(embeddedDir, `${name}${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return `${name}${ext}`;
}

function checkTcpPort(targetHost, targetPort, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(targetPort, targetHost);
  });
}

async function waitForPort(targetHost, targetPort, maxWaitMs = 10000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await checkTcpPort(targetHost, targetPort, 500)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function startPostgres() {
  const alreadyListening = await checkTcpPort(host, port);
  if (alreadyListening) {
    console.log(
      `[db:server] PostgreSQL 16 is already running and accepting connections on ${host}:${port}.`,
    );
    return;
  }

  const initdbBin = resolvePgBinary('initdb');
  const pgCtlBin = resolvePgBinary('pg_ctl');

  fs.mkdirSync(dataRoot, { recursive: true });

  const pgVersionFile = path.join(clusterDir, 'PG_VERSION');
  if (!fs.existsSync(pgVersionFile)) {
    console.log(
      '[db:server] Initializing local PostgreSQL 16 cluster in .postgres-data/cluster...',
    );
    const pwFile = path.join(dataRoot, '.pwtemp');
    fs.writeFileSync(pwFile, password + '\n', { encoding: 'utf-8', mode: 0o600 });
    try {
      execFileSync(
        initdbBin,
        [
          '-D',
          clusterDir,
          '-U',
          user,
          `--pwfile=${pwFile}`,
          '-E',
          'UTF8',
          '--locale=C',
          '-A',
          'scram-sha-256',
        ],
        { stdio: 'inherit' },
      );
    } finally {
      if (fs.existsSync(pwFile)) {
        fs.unlinkSync(pwFile);
      }
    }
  }

  // Remove stale postmaster.pid if the process is no longer listening
  const pidFile = path.join(clusterDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // ignore
    }
  }

  console.log(`[db:server] Starting local PostgreSQL 16 server on ${host}:${port}...`);

  let startedViaWmi = false;
  if (process.platform === 'win32') {
    const cmdLine = `"${pgCtlBin}" -D "${clusterDir}" -l "${logFile}" -o "-p ${port} -h ${host}" start`;
    const psScript = `$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${cmdLine.replace(/'/g, "''")}'; CurrentDirectory = '${rootDir.replace(/'/g, "''")}' }; if ($res.ReturnValue -ne 0) { exit 1 }`;
    const wmiRes = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
      encoding: 'utf-8',
    });
    if (wmiRes.status === 0) {
      startedViaWmi = await waitForPort(host, port, 8000);
    }
  }

  if (!startedViaWmi) {
    execFileSync(
      pgCtlBin,
      ['-D', clusterDir, '-l', logFile, '-o', `-p ${port} -h ${host}`, '-w', 'start'],
      { stdio: 'inherit' },
    );
  }

  const ready = await waitForPort(host, port, 5000);
  if (!ready) {
    throw new Error(`PostgreSQL started but did not accept TCP connections on ${host}:${port}`);
  }
  console.log(`[db:server] PostgreSQL 16 is running and ready on ${host}:${port}.`);
}

async function stopPostgres() {
  const pidFile = path.join(clusterDir, 'postmaster.pid');
  if (!fs.existsSync(pidFile)) {
    console.log('[db:server] Local PostgreSQL cluster is not running (no postmaster.pid).');
    return;
  }

  const pgCtlBin = resolvePgBinary('pg_ctl');
  console.log('[db:server] Stopping local PostgreSQL server...');
  execFileSync(pgCtlBin, ['-D', clusterDir, '-m', 'fast', '-w', 'stop'], {
    stdio: 'inherit',
  });
  console.log('[db:server] Local PostgreSQL server stopped cleanly.');
}

async function statusPostgres() {
  const listening = await checkTcpPort(host, port);
  console.log(`[db:server] PostgreSQL TCP ${host}:${port}: ${listening ? 'ONLINE' : 'OFFLINE'}`);
  if (!listening) {
    process.exitCode = 1;
  }
}

const action = process.argv[2] ?? 'status';
if (action === 'start') {
  await startPostgres();
} else if (action === 'stop') {
  await stopPostgres();
} else {
  await statusPostgres();
}
