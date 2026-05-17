import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type LedgerRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface ActiveMember {
  role: LedgerRole;
  status: 'active' | 'invited' | 'removed';
}

const MANAGER_ROLES = new Set<LedgerRole>(['owner', 'admin']);
const EDITOR_ROLES = new Set<LedgerRole>(['owner', 'admin', 'editor']);

@Injectable()
export class LedgerPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async canViewLedger(userId: string, ledgerId: string): Promise<boolean> {
    return (await this.findActiveMember(userId, ledgerId)) !== null;
  }

  async canManageLedger(userId: string, ledgerId: string): Promise<boolean> {
    const member = await this.findActiveMember(userId, ledgerId);
    return member ? MANAGER_ROLES.has(member.role) : false;
  }

  async canCreateTransaction(userId: string, ledgerId: string): Promise<boolean> {
    const member = await this.findActiveMember(userId, ledgerId);
    return member ? EDITOR_ROLES.has(member.role) : false;
  }

  async canUpdateTransaction(userId: string, transactionId: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        ledgerId: true,
        visibility: true,
        createdBy: true,
        deletedAt: true,
      },
    });

    if (!transaction || transaction.deletedAt) {
      return false;
    }

    const member = await this.findActiveMember(userId, transaction.ledgerId);
    if (!member) {
      return false;
    }

    if (transaction.visibility === 'private') {
      return transaction.createdBy === userId;
    }

    if (transaction.visibility === 'ledger') {
      return MANAGER_ROLES.has(member.role) || (member.role === 'editor' && transaction.createdBy === userId);
    }

    return false;
  }

  async canViewTransaction(userId: string, transactionId: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        ledgerId: true,
        visibility: true,
        createdBy: true,
        deletedAt: true,
      },
    });

    if (!transaction || transaction.deletedAt) {
      return false;
    }

    const member = await this.findActiveMember(userId, transaction.ledgerId);
    if (!member) {
      return false;
    }

    if (transaction.visibility === 'private') {
      return transaction.createdBy === userId;
    }

    if (transaction.visibility === 'ledger') {
      return true;
    }

    return false;
  }

  async canViewAccount(userId: string, accountId: string): Promise<boolean> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        ledgerId: true,
        visibility: true,
        ownerId: true,
        archivedAt: true,
      },
    });

    if (!account || account.archivedAt) {
      return false;
    }

    const member = await this.findActiveMember(userId, account.ledgerId);
    if (!member) {
      return false;
    }

    if (account.visibility === 'private') {
      return account.ownerId === userId;
    }

    if (account.visibility === 'ledger') {
      return true;
    }

    return false;
  }

  private async findActiveMember(userId: string, ledgerId: string): Promise<ActiveMember | null> {
    const ledger = await this.prisma.ledger.findUnique({
      where: { id: ledgerId },
      select: { id: true, archivedAt: true },
    });
    if (!ledger || ledger.archivedAt) {
      return null;
    }

    const member = await this.prisma.ledgerMember.findUnique({
      where: {
        ledgerId_userId: {
          ledgerId,
          userId,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (!member || member.status !== 'active') {
      return null;
    }

    return member;
  }
}
