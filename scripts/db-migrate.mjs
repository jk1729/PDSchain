import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const mode = process.argv[2] ?? 'deploy';
const prismaCli = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');

let args = [prismaCli, 'migrate', 'deploy', '--schema=prisma/schema.prisma'];
if (mode === 'dev') {
  args = [prismaCli, 'migrate', 'dev', '--schema=prisma/schema.prisma'];
} else if (mode === 'status') {
  args = [prismaCli, 'migrate', 'status', '--schema=prisma/schema.prisma'];
}

const result = spawnSync(process.execPath, args, {
  cwd: rootDir,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
