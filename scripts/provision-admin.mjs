import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import { PrismaClient, CanonicalRole, AccountStatus } from '@prisma/client';
import { Algorithm, hash } from '@node-rs/argon2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const prisma = new PrismaClient();

async function runProvisioning() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL || process.argv[2];
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || process.argv[3];
  const fullName =
    process.env.ADMIN_BOOTSTRAP_FULL_NAME || process.argv[4] || 'PDSChain Root Administrator';
  const allowRecovery = process.argv.includes('--allow-recovery');

  if (!email || !password) {
    console.error(
      'Usage: node scripts/provision-admin.mjs <email> <password> [fullName] [--allow-recovery]',
    );
    console.error('Or set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (password.length < 12) {
    console.error('Error: Administrator password must be at least 12 characters long.');
    process.exit(1);
  }

  try {
    const existingAdminCount = await prisma.userRoleAssignment.count({
      where: {
        role: CanonicalRole.ADMIN,
        revokedAt: null,
      },
    });

    if (existingAdminCount > 0 && !allowRecovery) {
      console.error(
        'Error: An active administrator account already exists. Bootstrap aborted without --allow-recovery flag.',
      );
      process.exit(1);
    }

    const memoryCost = Number(process.env.ARGON2_MEMORY_COST ?? 19456);
    const timeCost = Number(process.env.ARGON2_TIME_COST ?? 2);
    const parallelism = Number(process.env.ARGON2_PARALLELISM ?? 1);

    const passwordHash = await hash(password, {
      algorithm: Algorithm.Argon2id,
      memoryCost,
      timeCost,
      parallelism,
    });

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            fullName: fullName.trim(),
            passwordHash,
            emailVerifiedAt: now,
            status: AccountStatus.ACTIVE,
            termsAcceptedAt: now,
          },
        });

        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            role: CanonicalRole.CITIZEN,
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            emailVerifiedAt: now,
            status: AccountStatus.ACTIVE,
          },
        });
      }

      const hasAdmin = await tx.userRoleAssignment.findFirst({
        where: {
          userId: user.id,
          role: CanonicalRole.ADMIN,
          revokedAt: null,
        },
      });

      if (!hasAdmin) {
        await tx.userRoleAssignment.create({
          data: {
            userId: user.id,
            role: CanonicalRole.ADMIN,
          },
        });
      }

      await tx.securityAuditEvent.create({
        data: {
          eventType: 'ADMIN_BOOTSTRAPPED',
          outcome: 'SUCCESS',
          actorUserId: user.id,
          targetUserId: user.id,
          metadata: {
            email: normalizedEmail,
            recoveryMode: allowRecovery,
          },
        },
      });

      return user;
    });

    console.log('=== PDSChain v2 Administrator Provisioning Successful ===');
    console.log(`Administrator ID:    ${result.id}`);
    console.log(`Administrator Email: ${result.email}`);
    console.log(`Status:              PROVISIONED (ACTIVE & VERIFIED)`);
    console.log(`Role:                ADMIN + CITIZEN`);
  } finally {
    await prisma.$disconnect();
  }
}

runProvisioning().catch((err) => {
  console.error('Administrator provisioning failed:', err.message);
  process.exit(1);
});
