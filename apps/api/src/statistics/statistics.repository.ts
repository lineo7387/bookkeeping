import { Injectable } from '@nestjs/common';
import type {
  AccountBalanceStatisticsSummary,
  AccountType,
  AccountVisibility,
  CategoryStatisticsSummary,
  CategoryType,
  MemberExpenseStatisticsSummary,
  MonthlyStatisticsSummary,
  TransactionType,
} from '@bookkeeping/shared-types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CategoryStatisticsQueryDto } from './dto/category-statistics-query.dto';
import type { StatisticsDateRangeQueryDto } from './dto/statistics-date-range-query.dto';

type DecimalLike = { toString(): string };

type MonthlyTransactionRecord = {
  type: TransactionType;
  amount: DecimalLike;
};

type CategoryTransactionRecord = {
  categoryId: string | null;
  amount: DecimalLike;
  category: { name: string } | null;
};

type AccountBalanceRecord = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: DecimalLike;
  visibility: AccountVisibility | 'selected_members';
};

type MemberExpenseRecord = {
  createdBy: string;
  amount: DecimalLike;
  creator: { nickname: string };
};

@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlySummary(
    userId: string,
    ledgerId: string,
    query: StatisticsDateRangeQueryDto,
  ): Promise<MonthlyStatisticsSummary> {
    const transactions = (await this.prisma.transaction.findMany({
      where: visibleTransactionWhere(userId, ledgerId, query),
      select: { type: true, amount: true },
    })) as unknown as MonthlyTransactionRecord[];

    const totals = transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income = acc.income.plus(transaction.amount.toString());
        }
        if (transaction.type === 'expense') {
          acc.expense = acc.expense.plus(transaction.amount.toString());
        }
        return acc;
      },
      { income: decimalZero(), expense: decimalZero() },
    );

    return {
      ledgerId,
      occurredFrom: query.occurredFrom ?? null,
      occurredTo: query.occurredTo ?? null,
      income: formatDecimal(totals.income),
      expense: formatDecimal(totals.expense),
      net: formatDecimal(totals.income.minus(totals.expense)),
    };
  }

  async getCategoryBreakdown(
    userId: string,
    ledgerId: string,
    query: CategoryStatisticsQueryDto,
  ): Promise<CategoryStatisticsSummary> {
    const type = query.type ?? 'expense';
    const transactions = (await this.prisma.transaction.findMany({
      where: {
        ...visibleTransactionWhere(userId, ledgerId, query),
        type,
      },
      select: { categoryId: true, amount: true, category: { select: { name: true } } },
    })) as unknown as CategoryTransactionRecord[];

    const groups = new Map<string, { categoryId: string | null; categoryName: string | null; amount: Prisma.Decimal; count: number }>();
    for (const transaction of transactions) {
      const key = transaction.categoryId ?? '__uncategorized__';
      const group = groups.get(key) ?? {
        categoryId: transaction.categoryId,
        categoryName: transaction.category?.name ?? null,
        amount: decimalZero(),
        count: 0,
      };
      group.amount = group.amount.plus(transaction.amount.toString());
      group.count += 1;
      groups.set(key, group);
    }

    const total = sumDecimals([...groups.values()].map((group) => group.amount));
    const items = [...groups.values()]
      .sort((left, right) => compareDecimalDesc(left.amount, right.amount))
      .map((group) => ({
        categoryId: group.categoryId,
        categoryName: group.categoryName,
        amount: formatDecimal(group.amount),
        transactionCount: group.count,
        percentage: formatPercentage(group.amount, total),
      }));

    return {
      ledgerId,
      type,
      total: formatDecimal(total),
      items,
    };
  }

  async getAccountBalances(userId: string, ledgerId: string): Promise<AccountBalanceStatisticsSummary> {
    const accounts = await this.prisma.account.findMany({
      where: {
        ledgerId,
        archivedAt: null,
        OR: [{ visibility: 'ledger' }, { visibility: 'private', ownerId: userId }],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        currentBalance: true,
        visibility: true,
      },
    });

    const records = accounts as AccountBalanceRecord[];
    const totalBalance = sumDecimals(records.map((account) => toDecimal(account.currentBalance)));

    return {
      ledgerId,
      totalBalance: formatDecimal(totalBalance),
      items: records.map((account) => ({
        accountId: account.id,
        accountName: account.name,
        type: account.type,
        currency: account.currency,
        currentBalance: formatDecimal(account.currentBalance),
        visibility: account.visibility === 'private' ? 'private' : 'ledger',
      })),
    };
  }

  async getMemberExpenses(
    userId: string,
    ledgerId: string,
    query: StatisticsDateRangeQueryDto,
  ): Promise<MemberExpenseStatisticsSummary> {
    const transactions = (await this.prisma.transaction.findMany({
      where: {
        ...visibleTransactionWhere(userId, ledgerId, query),
        type: 'expense',
      },
      select: { createdBy: true, amount: true, creator: { select: { nickname: true } } },
    })) as unknown as MemberExpenseRecord[];

    const groups = new Map<string, { userId: string; nickname: string; amount: Prisma.Decimal; count: number }>();
    for (const transaction of transactions) {
      const group = groups.get(transaction.createdBy) ?? {
        userId: transaction.createdBy,
        nickname: transaction.creator.nickname,
        amount: decimalZero(),
        count: 0,
      };
      group.amount = group.amount.plus(transaction.amount.toString());
      group.count += 1;
      groups.set(transaction.createdBy, group);
    }

    const totalExpense = sumDecimals([...groups.values()].map((group) => group.amount));
    const items = [...groups.values()]
      .sort((left, right) => compareDecimalDesc(left.amount, right.amount))
      .map((group) => ({
        userId: group.userId,
        nickname: group.nickname,
        amount: formatDecimal(group.amount),
        transactionCount: group.count,
        percentage: formatPercentage(group.amount, totalExpense),
      }));

    return {
      ledgerId,
      totalExpense: formatDecimal(totalExpense),
      items,
    };
  }
}

function visibleTransactionWhere(
  userId: string,
  ledgerId: string,
  query: StatisticsDateRangeQueryDto,
): Prisma.TransactionWhereInput {
  return {
    ledgerId,
    deletedAt: null,
    occurredAt: {
      gte: query.occurredFrom ? new Date(query.occurredFrom) : undefined,
      lte: query.occurredTo ? new Date(query.occurredTo) : undefined,
    },
    OR: [{ visibility: 'ledger' as const }, { visibility: 'private' as const, createdBy: userId }],
  };
}

function decimalZero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

function toDecimal(value: DecimalLike | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

function sumDecimals(values: Array<DecimalLike | Prisma.Decimal>): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((total, value) => total.plus(value.toString()), decimalZero());
}

function compareDecimalDesc(left: Prisma.Decimal, right: Prisma.Decimal): number {
  if (left.equals(right)) {
    return 0;
  }
  return left.lessThan(right) ? 1 : -1;
}

function formatDecimal(value: DecimalLike | Prisma.Decimal): string {
  return toDecimal(value).toFixed(2);
}

function formatPercentage(amount: Prisma.Decimal, total: Prisma.Decimal): string {
  if (total.equals(0)) {
    return '0.00';
  }
  return amount.div(total).mul(100).toFixed(2);
}
