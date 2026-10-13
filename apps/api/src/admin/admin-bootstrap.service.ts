import { ConflictException, Injectable } from '@nestjs/common';
import { AccountStatus, CanonicalRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../security/crypto.service';

export interface BootstrapAdminParams {
  email: string;
  password: string;
  fullName: string;
  allowRecovery?: boolean;
}

export interface BootstrapAdminResult {
  userId: string;
  email: string;
  fullName: string;
  status: string;
}

@Injectable()
export class AdminBootstrapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly auditService: AuditService,
  ) {}

  async bootstrapAdmin(params: BootstrapAdminParams): Promise<BootstrapAdminResult> {
    const normalizedEmail = this.cryptoService.normalizeEmail(params.email);
    const trimmedName = params.fullName.trim();

    if (!params.password || params.password.length < 12) {
      throw new Error('Administrator password must be at least 12 characters long.');
    }

    // Check if an active administrator assignment already exists
    const existingAdminCount = await this.prisma.userRoleAssignment.count({
      where: {
        role: CanonicalRole.ADMIN,
        revokedAt: null,
      },
    });

    if (existingAdminCount > 0 && !params.allowRecovery) {
      throw new ConflictException({
        code: 'ADMIN_ALREADY_EXISTS',
        message:
          'An active administrator already exists in the system. Bootstrap refused without explicit recovery authorization.',
      });
    }

    const passwordHash = await this.cryptoService.hashPassword(params.password);
    const now = new Date();

    const createdAdmin = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            fullName: trimmedName,
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

      // Check if admin role assignment already exists for this user
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

      await this.auditService.recordEvent(
        {
          eventType: 'ADMIN_BOOTSTRAPPED',
          outcome: 'SUCCESS',
          actorUserId: user.id,
          targetUserId: user.id,
          metadata: {
            email: normalizedEmail,
            recoveryMode: Boolean(params.allowRecovery),
          },
        },
        tx,
      );

      return user;
    });

    return {
      userId: createdAdmin.id,
      email: createdAdmin.email,
      fullName: createdAdmin.fullName,
      status: 'ADMIN_PROVISIONED',
    };
  }
}
