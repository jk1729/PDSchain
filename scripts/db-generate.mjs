import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const prismaCli = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(
  process.execPath,
  [prismaCli, 'generate', '--schema=prisma/schema.prisma'],
  {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

// Ensure @prisma/client root type re-exports point cleanly to .prisma/client
const prismaClientDir = path.join(rootDir, 'node_modules', '@prisma', 'client');
if (fs.existsSync(prismaClientDir)) {
  const reExportContent = "export * from '.prisma/client/default';\n";
  for (const fileName of ['default.d.ts', 'index.d.ts']) {
    const targetFile = path.join(prismaClientDir, fileName);
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, reExportContent, 'utf-8');
    }
  }

  // Ensure runtime type definitions are present in @prisma/client/runtime
  const runtimeSrcDir = path.join(rootDir, 'node_modules', 'prisma', 'prisma-client', 'runtime');
  const runtimeDestDir = path.join(prismaClientDir, 'runtime');
  if (fs.existsSync(runtimeSrcDir) && fs.existsSync(runtimeDestDir)) {
    for (const f of fs.readdirSync(runtimeSrcDir)) {
      if (f.endsWith('.d.ts') || f.endsWith('.d.mts')) {
        const target = path.join(runtimeDestDir, f);
        if (!fs.existsSync(target)) {
          fs.copyFileSync(path.join(runtimeSrcDir, f), target);
        }
      }
    }
  }
}
