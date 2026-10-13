import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface RecordAuditEventInput {
  eventType: string;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetResourceType?: string | null;
  targetResourceId?: string | null;
  ipAddress?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|cookie|authorization|hash|seed|private|credential|mnemonic/i;

/**
 * Recursively sanitizes audit metadata so secrets, raw tokens, passwords,
 * cookies, and authorization headers can never be persisted in audit records.
 */
export function sanitizeAuditMetadata(
  input: Record<string, unknown> | null | undefined,
): Prisma.InputJsonObject | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const clean: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clean[key] = '[REDACTED]';
      continue;
    }
    if (value === null || value === undefined) {
      clean[key] = null;
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      clean[key] = value;
    } else if (Array.isArray(value)) {
      clean[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? (sanitizeAuditMetadata(item as Record<string, unknown>) ?? null)
          : String(item),
      );
    } else if (typeof value === 'object') {
      clean[key] = sanitizeAuditMetadata(value as Record<string, unknown>) ?? null;
    }
  }
  return clean as Prisma.InputJsonObject;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(input: RecordAuditEventInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    const sanitizedMetadata = sanitizeAuditMetadata(input.metadata);

    await client.securityAuditEvent.create({
      data: {
        eventType: input.eventType,
        outcome: input.outcome,
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        targetResourceType: input.targetResourceType ?? null,
        targetResourceId: input.targetResourceId ?? null,
        ipAddress: input.ipAddress ?? null,
        correlationId: input.correlationId ?? null,
        metadata: sanitizedMetadata ?? Prisma.DbNull,
      },
    });
  }

  async listRecentEvents(limit = 100) {
    return this.prisma.securityAuditEvent.findMany({
      take: Math.min(Math.max(limit, 1), 250),
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: { id: true, email: true, fullName: true },
        },
        targetUser: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });
  }
}
