import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogCreateData {
  actorUserId?: string | null;
  ledgerId?: string | null;
  targetType: string;
  targetId?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AuditLogCreateData) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId ?? null,
        ledgerId: data.ledgerId ?? null,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        action: data.action,
        summary: data.summary,
        metadata: toPrismaJson(data.metadata),
      },
    });

    return {
      id: auditLog.id,
      actorUserId: auditLog.actorUserId,
      ledgerId: auditLog.ledgerId,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      action: auditLog.action,
      summary: auditLog.summary,
      metadata: auditLog.metadata as Record<string, unknown> | null,
      createdAt: auditLog.createdAt.toISOString(),
    };
  }
}

function toPrismaJson(
  metadata: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (metadata === undefined) {
    return undefined;
  }
  if (metadata === null) {
    return Prisma.JsonNull;
  }
  return metadata as Prisma.InputJsonObject;
}
