import { Injectable } from '@nestjs/common';
import type { LedgerPermission, LedgerRole, LedgerSummary } from '@bookkeeping/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLedgerDto } from './dto/create-ledger.dto';
import type { UpdateLedgerDto } from './dto/update-ledger.dto';

export interface LedgerMemberSummary {
  id: string;
  ledgerId: string;
  userId: string;
  role: LedgerRole;
  status: 'active' | 'invited' | 'removed';
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class LedgersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithOwner(userId: string, dto: CreateLedgerDto): Promise<LedgerSummary> {
    return this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledger.create({
        data: {
          name: dto.name,
          type: dto.type,
          ownerId: userId,
          defaultCurrency: dto.defaultCurrency,
          timezone: dto.timezone,
        },
      });

      await tx.ledgerMember.create({
        data: {
          ledgerId: ledger.id,
          userId,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        },
      });

      return toLedgerSummary(ledger, 'owner');
    });
  }

  async findLedgersForUser(userId: string): Promise<LedgerSummary[]> {
    const members = await this.prisma.ledgerMember.findMany({
      where: {
        userId,
        status: 'active',
        ledger: {
          archivedAt: null,
        },
      },
      include: {
        ledger: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return members.map((member) => toLedgerSummary(member.ledger, member.role));
  }

  async findLedgerForUser(userId: string, ledgerId: string): Promise<LedgerSummary | null> {
    const member = await this.prisma.ledgerMember.findFirst({
      where: {
        ledgerId,
        userId,
        status: 'active',
        ledger: {
          archivedAt: null,
        },
      },
      include: {
        ledger: true,
      },
    });

    return member ? toLedgerSummary(member.ledger, member.role) : null;
  }

  async updateLedger(
    userId: string,
    ledgerId: string,
    dto: UpdateLedgerDto,
  ): Promise<LedgerSummary | null> {
    await this.prisma.ledger.update({
      where: { id: ledgerId },
      data: dto,
    });

    return this.findLedgerForUser(userId, ledgerId);
  }

  async archiveLedger(ledgerId: string): Promise<{ archived: true }> {
    await this.prisma.ledger.update({
      where: { id: ledgerId },
      data: { archivedAt: new Date() },
    });
    return { archived: true };
  }

  async findMember(memberId: string): Promise<{ id: string; role: LedgerRole } | null> {
    const member = await this.prisma.ledgerMember.findUnique({
      where: { id: memberId },
      select: { id: true, role: true },
    });
    return member;
  }

  async findMemberByUser(ledgerId: string, userId: string): Promise<{ id: string; role: LedgerRole } | null> {
    const member = await this.prisma.ledgerMember.findUnique({
      where: {
        ledgerId_userId: {
          ledgerId,
          userId,
        },
      },
      select: { id: true, role: true },
    });
    return member;
  }

  async listMembers(ledgerId: string): Promise<LedgerMemberSummary[]> {
    const members = await this.prisma.ledgerMember.findMany({
      where: { ledgerId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    return members.map(toMemberSummary);
  }

  async updateMemberRole(
    memberId: string,
    role: 'admin' | 'editor' | 'viewer',
  ): Promise<LedgerMemberSummary> {
    const member = await this.prisma.ledgerMember.update({
      where: { id: memberId },
      data: { role },
    });
    return toMemberSummary(member);
  }

  async removeMember(memberId: string): Promise<LedgerMemberSummary> {
    const member = await this.prisma.ledgerMember.update({
      where: { id: memberId },
      data: { status: 'removed' },
    });
    return toMemberSummary(member);
  }
}

function toLedgerSummary(
  ledger: {
    id: string;
    name: string;
    type: 'personal' | 'family';
    defaultCurrency: string;
    timezone: string;
  },
  role: LedgerRole,
): LedgerSummary {
  return {
    id: ledger.id,
    name: ledger.name,
    type: ledger.type,
    defaultCurrency: ledger.defaultCurrency,
    timezone: ledger.timezone,
    currentMember: {
      role,
      permissions: permissionsForRole(role),
    },
  };
}

function toMemberSummary(member: {
  id: string;
  ledgerId: string;
  userId: string;
  role: LedgerRole;
  status: 'active' | 'invited' | 'removed';
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): LedgerMemberSummary {
  return {
    id: member.id,
    ledgerId: member.ledgerId,
    userId: member.userId,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function permissionsForRole(role: LedgerRole): LedgerPermission[] {
  if (role === 'owner') {
    return [
      'ledger:view',
      'ledger:manage',
      'member:invite',
      'member:manage',
      'account:create',
      'account:update',
      'category:create',
      'category:update',
      'budget:manage',
      'transaction:create',
      'transaction:update',
      'transaction:delete',
      'transaction:view',
    ];
  }

  if (role === 'admin') {
    return [
      'ledger:view',
      'member:invite',
      'member:manage',
      'account:create',
      'account:update',
      'category:create',
      'category:update',
      'budget:manage',
      'transaction:create',
      'transaction:update',
      'transaction:delete',
      'transaction:view',
    ];
  }

  if (role === 'editor') {
    return ['ledger:view', 'transaction:create', 'transaction:update', 'transaction:delete', 'transaction:view'];
  }

  return ['ledger:view', 'transaction:view'];
}
