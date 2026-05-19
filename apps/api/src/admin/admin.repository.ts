import { Injectable } from '@nestjs/common';
import type {
  AdminAiTaskSummary,
  AdminAuditLogSummary,
  AdminLedgerSummary,
  AdminUserSummary,
  PaginatedItems,
} from '@bookkeeping/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type { ListAdminQueryDto } from './dto/list-admin-query.dto';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: Required<ListAdminQueryDto>): Promise<PaginatedItems<AdminUserSummary>> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: query.offset,
      take: query.limit,
      select: {
        id: true,
        email: true,
        phone: true,
        nickname: true,
        status: true,
        isSystemAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        nickname: user.nickname,
        status: user.status,
        isSystemAdmin: user.isSystemAdmin,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async listLedgers(query: Required<ListAdminQueryDto>): Promise<PaginatedItems<AdminLedgerSummary>> {
    const ledgers = await this.prisma.ledger.findMany({
      orderBy: { createdAt: 'desc' },
      skip: query.offset,
      take: query.limit,
      select: {
        id: true,
        name: true,
        type: true,
        ownerId: true,
        defaultCurrency: true,
        timezone: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true } },
      },
    });

    return {
      items: ledgers.map((ledger) => ({
        id: ledger.id,
        name: ledger.name,
        type: ledger.type,
        ownerId: ledger.ownerId,
        defaultCurrency: ledger.defaultCurrency,
        timezone: ledger.timezone,
        memberCount: ledger._count.members,
        archivedAt: ledger.archivedAt?.toISOString() ?? null,
        createdAt: ledger.createdAt.toISOString(),
        updatedAt: ledger.updatedAt.toISOString(),
      })),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async listAiTasks(query: Required<ListAdminQueryDto>): Promise<PaginatedItems<AdminAiTaskSummary>> {
    const tasks = await this.prisma.aiTask.findMany({
      orderBy: { createdAt: 'desc' },
      skip: query.offset,
      take: query.limit,
      select: {
        id: true,
        status: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      items: tasks.map((task) => ({
        id: task.id,
        status: task.status,
        type: task.type,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async listAuditLogs(query: Required<ListAdminQueryDto>): Promise<PaginatedItems<AdminAuditLogSummary>> {
    const auditLogs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: query.offset,
      take: query.limit,
    });

    return {
      items: auditLogs.map((auditLog) => ({
        id: auditLog.id,
        actorUserId: auditLog.actorUserId,
        ledgerId: auditLog.ledgerId,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        action: auditLog.action,
        summary: auditLog.summary,
        metadata: auditLog.metadata as Record<string, unknown> | null,
        createdAt: auditLog.createdAt.toISOString(),
      })),
      limit: query.limit,
      offset: query.offset,
    };
  }
}
