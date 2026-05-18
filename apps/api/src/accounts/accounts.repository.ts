import { Injectable } from '@nestjs/common';
import type { AccountSummary, AccountVisibility } from '@bookkeeping/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAccountDto } from './dto/create-account.dto';
import type { UpdateAccountDto } from './dto/update-account.dto';

type AccountRecord = {
  id: string;
  ledgerId: string;
  name: string;
  type: AccountSummary['type'];
  currency: string;
  initialBalance: { toString(): string };
  currentBalance: { toString(): string };
  visibility: AccountVisibility | 'selected_members';
  ownerId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountUpdateData = UpdateAccountDto & { ownerId?: string };

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listVisibleForUser(userId: string, ledgerId: string): Promise<AccountSummary[]> {
    const accounts = await this.prisma.account.findMany({
      where: {
        ledgerId,
        archivedAt: null,
        OR: [{ visibility: 'ledger' }, { visibility: 'private', ownerId: userId }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return accounts.map(toAccountSummary);
  }

  async create(userId: string, ledgerId: string, dto: CreateAccountDto): Promise<AccountSummary> {
    const initialBalance = dto.initialBalance ?? '0';
    const account = await this.prisma.account.create({
      data: {
        ledgerId,
        ownerId: userId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency ?? 'CNY',
        initialBalance,
        currentBalance: dto.currentBalance ?? initialBalance,
        visibility: dto.visibility ?? 'ledger',
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return toAccountSummary(account);
  }

  async findActiveById(accountId: string): Promise<AccountSummary | null> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        archivedAt: null,
      },
    });

    return account ? toAccountSummary(account) : null;
  }

  async update(accountId: string, dto: AccountUpdateData): Promise<AccountSummary> {
    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: dto,
    });

    return toAccountSummary(account);
  }

  async archive(accountId: string): Promise<{ archived: true }> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { archivedAt: new Date() },
    });

    return { archived: true };
  }
}

function toAccountSummary(account: AccountRecord): AccountSummary {
  return {
    id: account.id,
    ledgerId: account.ledgerId,
    name: account.name,
    type: account.type,
    currency: account.currency,
    initialBalance: account.initialBalance.toString(),
    currentBalance: account.currentBalance.toString(),
    visibility: account.visibility === 'private' ? 'private' : 'ledger',
    ownerId: account.ownerId,
    sortOrder: account.sortOrder,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
