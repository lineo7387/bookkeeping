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

  canUpdateTransaction(_userId: string, _transactionId: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  canViewTransaction(_userId: string, _transactionId: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  canViewAccount(_userId: string, _accountId: string): Promise<boolean> {
    return Promise.resolve(false);
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
