import { Injectable } from '@nestjs/common';
import type {
  AccountSummary,
  AccountVisibility,
  CategorySummary,
  CategoryType,
  TransactionSource,
  TransactionSummary,
  TransactionType,
  TransactionVisibility,
} from '@bookkeeping/shared-types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

type DecimalLike = { toString(): string };

type TransactionRecord = {
  id: string;
  ledgerId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: DecimalLike;
  currency: string;
  occurredAt: Date;
  merchant: string | null;
  note: string | null;
  visibility: TransactionVisibility;
  createdBy: string;
  source: TransactionSource;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type AccountRecord = {
  id: string;
  ledgerId: string;
  name: string;
  type: AccountSummary['type'];
  currency: string;
  initialBalance: DecimalLike;
  currentBalance: DecimalLike;
  visibility: AccountVisibility | 'selected_members';
  ownerId: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryRecord = {
  id: string;
  ledgerId: string;
  parentId: string | null;
  type: CategoryType;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type TransactionClient = {
  transaction: {
    create(args: Prisma.TransactionCreateArgs): Promise<TransactionRecord>;
    updateMany(args: Prisma.TransactionUpdateManyArgs): Promise<Prisma.BatchPayload>;
    findFirst(args: Prisma.TransactionFindFirstArgs): Promise<TransactionRecord | null>;
  };
  account: {
    updateMany(args: Prisma.AccountUpdateManyArgs): Promise<Prisma.BatchPayload>;
  };
};

export type TransferMetadata = { transferTargetAccountId: string };

export interface TransactionCreateData {
  ledgerId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  occurredAt: Date;
  merchant?: string | null;
  note?: string | null;
  visibility: 'ledger' | 'private';
  createdBy: string;
  source: 'manual';
  metadata?: TransferMetadata | null;
}

export interface TransactionUpdateData {
  accountId?: string;
  categoryId?: string | null;
  type?: TransactionType;
  amount?: string;
  currency?: string;
  occurredAt?: Date;
  merchant?: string | null;
  note?: string | null;
  visibility?: 'ledger' | 'private';
  metadata?: TransferMetadata | null;
}

export interface AccountBalanceChange {
  accountId: string;
  delta: string;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listVisibleForUser(
    userId: string,
    ledgerId: string,
    query: ListTransactionsQueryDto = {},
  ): Promise<TransactionSummary[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ledgerId,
        deletedAt: null,
        type: query.type,
        accountId: query.accountId,
        categoryId: query.categoryId,
        occurredAt: {
          gte: query.occurredFrom ? new Date(query.occurredFrom) : undefined,
          lte: query.occurredTo ? new Date(query.occurredTo) : undefined,
        },
        OR: [{ visibility: 'ledger' }, { visibility: 'private', createdBy: userId }],
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    });

    return transactions.map(toTransactionSummary);
  }

  async create(data: TransactionCreateData): Promise<TransactionSummary> {
    const transaction = await this.prisma.transaction.create({
      data: {
        ledgerId: data.ledgerId,
        accountId: data.accountId,
        categoryId: data.categoryId,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        occurredAt: data.occurredAt,
        merchant: data.merchant,
        note: data.note,
        visibility: data.visibility,
        createdBy: data.createdBy,
        source: data.source,
        metadata: toPrismaJson(data.metadata),
      },
    });

    return toTransactionSummary(transaction);
  }

  async createWithBalanceChanges(
    data: TransactionCreateData,
    balanceChanges: AccountBalanceChange[],
  ): Promise<TransactionSummary> {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          ledgerId: data.ledgerId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          occurredAt: data.occurredAt,
          merchant: data.merchant,
          note: data.note,
          visibility: data.visibility,
          createdBy: data.createdBy,
          source: data.source,
          metadata: toPrismaJson(data.metadata),
        },
      });
      await applyBalanceChanges(tx, balanceChanges);
      return created;
    });

    return toTransactionSummary(transaction);
  }

  async findActiveById(transactionId: string): Promise<TransactionSummary | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        deletedAt: null,
      },
    });

    return transaction ? toTransactionSummary(transaction) : null;
  }

  async findActiveAccountById(accountId: string): Promise<AccountSummary | null> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        archivedAt: null,
      },
    });

    return account ? toAccountSummary(account) : null;
  }

  async findActiveCategoryById(categoryId: string): Promise<CategorySummary | null> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        archivedAt: null,
      },
    });

    return category ? toCategorySummary(category) : null;
  }

  async update(transactionId: string, data: TransactionUpdateData): Promise<TransactionSummary | null> {
    const result = await this.prisma.transaction.updateMany({
      where: {
        id: transactionId,
        deletedAt: null,
      },
      data: toTransactionUpdateInput(data),
    });

    if (result.count === 0) {
      return null;
    }

    return this.findActiveById(transactionId);
  }

  async updateWithBalanceChanges(
    transactionId: string,
    data: TransactionUpdateData,
    balanceChanges: AccountBalanceChange[],
  ): Promise<TransactionSummary | null> {
    return this.prisma.$transaction(async (tx) => {
      await applyBalanceChanges(tx, balanceChanges);
      const result = await tx.transaction.updateMany({
        where: {
          id: transactionId,
          deletedAt: null,
        },
        data: toTransactionUpdateInput(data),
      });

      if (result.count === 0) {
        return null;
      }

      const transaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          deletedAt: null,
        },
      });

      return transaction ? toTransactionSummary(transaction) : null;
    });
  }

  async softDelete(transactionId: string, deletedAt: Date): Promise<{ deleted: true } | null> {
    const result = await this.prisma.transaction.updateMany({
      where: {
        id: transactionId,
        deletedAt: null,
      },
      data: { deletedAt },
    });

    if (result.count === 0) {
      return null;
    }

    return { deleted: true };
  }

  async softDeleteWithBalanceChanges(
    transactionId: string,
    deletedAt: Date,
    balanceChanges: AccountBalanceChange[],
  ): Promise<{ deleted: true } | null> {
    return this.prisma.$transaction(async (tx) => {
      await applyBalanceChanges(tx, balanceChanges);
      const result = await tx.transaction.updateMany({
        where: {
          id: transactionId,
          deletedAt: null,
        },
        data: { deletedAt },
      });

      return result.count === 0 ? null : { deleted: true };
    });
  }
}

function toTransactionSummary(transaction: TransactionRecord): TransactionSummary {
  return {
    id: transaction.id,
    ledgerId: transaction.ledgerId,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    occurredAt: transaction.occurredAt.toISOString(),
    merchant: transaction.merchant,
    note: transaction.note,
    visibility: transaction.visibility,
    createdBy: transaction.createdBy,
    source: transaction.source,
    metadata: toMetadataRecord(transaction.metadata),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
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

function toCategorySummary(category: CategoryRecord): CategorySummary {
  return {
    id: category.id,
    ledgerId: category.ledgerId,
    parentId: category.parentId,
    type: category.type,
    name: category.name,
    icon: category.icon,
    color: category.color,
    isSystem: category.isSystem,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function toMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function toPrismaJson(metadata: TransferMetadata | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (metadata === undefined) {
    return undefined;
  }
  if (metadata === null) {
    return Prisma.JsonNull;
  }
  return metadata;
}

function toTransactionUpdateInput(data: TransactionUpdateData): Prisma.TransactionUncheckedUpdateManyInput {
  return {
    accountId: data.accountId,
    categoryId: data.categoryId,
    type: data.type,
    amount: data.amount,
    currency: data.currency,
    occurredAt: data.occurredAt,
    merchant: data.merchant,
    note: data.note,
    visibility: data.visibility,
    metadata: data.metadata === undefined ? undefined : toPrismaJson(data.metadata),
  };
}

async function applyBalanceChanges(tx: TransactionClient, changes: AccountBalanceChange[]): Promise<void> {
  for (const change of changes) {
    await tx.account.updateMany({
      where: {
        id: change.accountId,
        archivedAt: null,
      },
      data: {
        currentBalance: {
          increment: change.delta,
        },
      },
    });
  }
}
