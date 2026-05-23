# M2 Account Balance Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link formal transaction create/update/delete flows to account `currentBalance` updates in one database transaction.

**Architecture:** Keep authorization in `LedgerPolicyService`, business decisions in `TransactionsService`, and Prisma transaction mechanics in `TransactionsRepository`. The service computes balance deltas from old/new transaction effects; the repository applies those deltas atomically with transaction writes.

**Tech Stack:** NestJS 11, Prisma 7 generated client, Jest, TypeScript, pnpm workspace.

---

## File Structure

- Modify: `docs/modules/accounts/账户说明.md`  
  Document that `current_balance` is now automatically affected by formal transaction lifecycle operations, while manual balance correction remains allowed.

- Modify: `docs/modules/transactions/流水说明.md`  
  Document M2 balance direction rules, transaction boundary, same-account transfer rejection, and verification commands.

- Modify: `apps/api/src/transactions/transactions.service.spec.ts`  
  Update repository mock method names and add TDD cases for balance deltas on create/update/delete.

- Modify: `apps/api/src/transactions/transactions.service.ts`  
  Replace direct repository create/update/delete calls with balance-aware methods. Add focused helper functions for transaction effects and Decimal-safe delta merging.

- Create: `apps/api/src/transactions/transactions.repository.spec.ts`  
  Add repository-level tests for Prisma `$transaction`, account balance increments, and write failure behavior.

- Modify: `apps/api/src/transactions/transactions.repository.ts`  
  Add `AccountBalanceChange`, balance-aware create/update/delete repository methods, and a transaction-client helper for account updates.

---

## Task 1: Update Chinese Module Docs

**Files:**
- Modify: `docs/modules/accounts/账户说明.md`
- Modify: `docs/modules/transactions/流水说明.md`

- [ ] **Step 1: Update account module rules**

In `docs/modules/accounts/账户说明.md`, replace the current M1.5 balance rule:

```txt
- `current_balance` 在 M1.5 由账户创建和账户更新接口维护；流水创建暂不自动变更账户余额，后续通过余额重算和流水联动统一补齐。
```

with:

```txt
- `current_balance` 在 M2 起由账户创建、账户手工修正和正式流水生命周期共同维护：创建收入增加余额，创建支出减少余额，创建转账扣减源账户并增加目标账户；更新或删除流水必须撤销旧影响并应用新影响或撤销影响。
- 流水写入与账户余额调整必须处于同一个 Prisma transaction，避免出现流水已创建但余额未更新的中间状态。
- 账户接口仍允许 owner/admin 对 `current_balance` 做手工修正，用于初始导入、漏记修正或线下核对；手工修正不会反向创建流水，后续余额变动台账会把它升级为明确的 adjustment entry。
```

- [ ] **Step 2: Update account extension points**

In `docs/modules/accounts/账户说明.md`, replace:

```txt
- 账户余额重算任务和异常余额修复工具。
```

with:

```txt
- 账户余额重算任务：从 `initial_balance` 和未删除正式流水重新计算 `current_balance`。
- 余额变动台账 `account_balance_entries`：记录流水、转账、手工修正和重算造成的余额变化，提供更强审计能力。
```

- [ ] **Step 3: Update transaction module rules**

In `docs/modules/transactions/流水说明.md`, replace:

```txt
- M1.5 流水创建、更新和删除暂不自动变更账户余额，账户余额联动和重算放到后续迭代。
```

with:

```txt
- M2 起正式流水创建、更新和删除会自动联动账户 `current_balance`：收入增加源账户余额，支出减少源账户余额，转账减少源账户余额并增加目标账户余额。
- 更新流水必须先撤销旧流水余额影响，再应用新流水余额影响；删除流水必须软删除并撤销旧余额影响。
- 流水写入、更新或软删除与账户余额增量更新必须在同一个 Prisma transaction 内完成。
- 转账源账户和目标账户不能相同，避免产生无意义流水和余额净零变动。
```

- [ ] **Step 4: Update transaction exceptions**

In `docs/modules/transactions/流水说明.md`, replace:

```txt
- 分类类型不匹配、金额非法、时间缺少时区、转账目标账户非法：`VALIDATION_FAILED`。
```

with:

```txt
- 分类类型不匹配、金额非法、时间缺少时区、转账目标账户非法、转账源账户与目标账户相同：`VALIDATION_FAILED`。
```

- [ ] **Step 5: Verify docs wording**

Run:

```bash
rg -n "M1.5 流水创建、更新和删除暂不自动|暂不自动变更账户余额" docs/modules/accounts/账户说明.md docs/modules/transactions/流水说明.md
```

Expected: no matches.

- [ ] **Step 6: Commit docs**

```bash
git add docs/modules/accounts/账户说明.md docs/modules/transactions/流水说明.md
git commit -m "docs: document m2 balance linking rules"
```

---

## Task 2: Service TDD For Create Balance Changes

**Files:**
- Modify: `apps/api/src/transactions/transactions.service.spec.ts`
- Modify: `apps/api/src/transactions/transactions.service.ts`

- [ ] **Step 1: Rename repository mock methods in the test setup**

In `apps/api/src/transactions/transactions.service.spec.ts`, update the mocked repository pick and object from:

```ts
      | 'create'
      | 'findActiveById'
      | 'findActiveAccountById'
      | 'findActiveCategoryById'
      | 'update'
      | 'softDelete'
```

to:

```ts
      | 'createWithBalanceChanges'
      | 'findActiveById'
      | 'findActiveAccountById'
      | 'findActiveCategoryById'
      | 'updateWithBalanceChanges'
      | 'softDeleteWithBalanceChanges'
```

and from:

```ts
      create: jest.fn(),
      findActiveById: jest.fn(),
      findActiveAccountById: jest.fn(),
      findActiveCategoryById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
```

to:

```ts
      createWithBalanceChanges: jest.fn(),
      findActiveById: jest.fn(),
      findActiveAccountById: jest.fn(),
      findActiveCategoryById: jest.fn(),
      updateWithBalanceChanges: jest.fn(),
      softDeleteWithBalanceChanges: jest.fn(),
```

- [ ] **Step 2: Update existing create assertions to expect balance-aware repository calls**

Replace each `repository.create` expectation in existing tests with `repository.createWithBalanceChanges`. For the private account test, use:

```ts
repository.createWithBalanceChanges.mockResolvedValue({ ...transaction, visibility: 'private' });

expect(repository.createWithBalanceChanges).toHaveBeenCalledWith(
  expect.objectContaining({
    ledgerId: 'ledger_1',
    createdBy: 'user_1',
    source: 'manual',
    visibility: 'private',
  }),
  [{ accountId: 'account_1', delta: '-86' }],
);
```

For tests that assert no write happened, replace:

```ts
expect(repository.create).not.toHaveBeenCalled();
```

with:

```ts
expect(repository.createWithBalanceChanges).not.toHaveBeenCalled();
```

- [ ] **Step 3: Add failing test for income create balance changes**

Add this test after the private visibility create test:

```ts
it('increments source account balance when creating income', async () => {
  const incomeCategory: CategorySummary = {
    ...expenseCategory,
    id: 'category_income',
    type: 'income',
    name: '工资',
  };
  policy.canCreateTransaction.mockResolvedValue(true);
  policy.canViewAccount.mockResolvedValue(true);
  repository.findActiveAccountById.mockResolvedValue(account);
  repository.findActiveCategoryById.mockResolvedValue(incomeCategory);
  repository.createWithBalanceChanges.mockResolvedValue({ ...transaction, type: 'income', amount: '5000.00' });

  await expect(
    service.createTransaction('user_1', 'ledger_1', {
      type: 'income',
      amount: '5000.00',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_income',
    }),
  ).resolves.toMatchObject({ type: 'income', amount: '5000.00' });

  expect(repository.createWithBalanceChanges).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'income', amount: '5000.00' }),
    [{ accountId: 'account_1', delta: '5000.00' }],
  );
});
```

- [ ] **Step 4: Add failing test for transfer create balance changes and same-account rejection**

Add:

```ts
it('moves balance between source and target accounts when creating transfer', async () => {
  policy.canCreateTransaction.mockResolvedValue(true);
  policy.canViewAccount.mockResolvedValue(true);
  repository.findActiveAccountById.mockResolvedValueOnce(account).mockResolvedValueOnce({
    ...account,
    id: 'account_2',
    name: '银行卡',
  });
  repository.createWithBalanceChanges.mockResolvedValue({
    ...transaction,
    type: 'transfer',
    categoryId: null,
    metadata: { transferTargetAccountId: 'account_2' },
  });

  await service.createTransaction('user_1', 'ledger_1', {
    type: 'transfer',
    amount: '100.00',
    occurredAt: '2026-05-18T10:00:00.000Z',
    accountId: 'account_1',
    transferTargetAccountId: 'account_2',
  });

  expect(repository.createWithBalanceChanges).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'transfer',
      metadata: { transferTargetAccountId: 'account_2' },
    }),
    [
      { accountId: 'account_1', delta: '-100.00' },
      { accountId: 'account_2', delta: '100.00' },
    ],
  );
});

it('rejects creating a transfer to the same account', async () => {
  policy.canCreateTransaction.mockResolvedValue(true);
  policy.canViewAccount.mockResolvedValue(true);
  repository.findActiveAccountById.mockResolvedValueOnce(account).mockResolvedValueOnce(account);

  await expect(
    service.createTransaction('user_1', 'ledger_1', {
      type: 'transfer',
      amount: '100.00',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      transferTargetAccountId: 'account_1',
    }),
  ).rejects.toMatchObject({
    constructor: BadRequestException,
    response: { success: false, error: { code: 'VALIDATION_FAILED' } },
  });
  expect(repository.createWithBalanceChanges).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Run service tests to verify RED**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts
```

Expected: FAIL because `TransactionsRepository` does not yet expose `createWithBalanceChanges`, `updateWithBalanceChanges`, or `softDeleteWithBalanceChanges`, and `TransactionsService` still calls old methods.

- [ ] **Step 6: Implement minimal service create path**

In `apps/api/src/transactions/transactions.service.ts`, update the create call:

```ts
return this.transactionsRepository.create(createData);
```

to:

```ts
return this.transactionsRepository.createWithBalanceChanges(createData, buildBalanceChanges(createData));
```

Add helper types and functions near the bottom of the file:

```ts
type BalanceEffect = {
  accountId: string;
  type: TransactionType;
  amount: string;
  transferTargetAccountId?: string;
};

type AccountBalanceChange = {
  accountId: string;
  delta: string;
};

function buildBalanceChanges(effect: BalanceEffect): AccountBalanceChange[] {
  if (effect.type === 'income') {
    return [{ accountId: effect.accountId, delta: effect.amount }];
  }
  if (effect.type === 'expense') {
    return [{ accountId: effect.accountId, delta: negateDecimalString(effect.amount) }];
  }
  if (!effect.transferTargetAccountId) {
    return [];
  }
  return [
    { accountId: effect.accountId, delta: negateDecimalString(effect.amount) },
    { accountId: effect.transferTargetAccountId, delta: effect.amount },
  ];
}

function negateDecimalString(value: string): string {
  return value.startsWith('-') ? value.slice(1) : `-${value}`;
}
```

In `resolveTransferMetadata`, after validating target account ledger, add:

```ts
if (targetAccount.id === transferSourceAccountId) {
  throw validationFailed('Transfer target account must be different from source account');
}
```

To make that compile, change the function signature to accept the source account id:

```ts
private async resolveTransferMetadata(
  userId: string,
  ledgerId: string,
  type: TransactionType,
  transferTargetAccountId: string | undefined,
  transferSourceAccountId: string,
  existingMetadata?: Record<string, unknown> | null,
): Promise<{ value: TransferMetadata; targetAccount: AccountSummary } | null>
```

and update call sites to pass `account.id` or `dto.accountId ?? transaction.accountId`.

- [ ] **Step 7: Add repository type/method stubs to make service compile**

In `apps/api/src/transactions/transactions.repository.ts`, export:

```ts
export interface AccountBalanceChange {
  accountId: string;
  delta: string;
}
```

Then add temporary methods:

```ts
async createWithBalanceChanges(
  data: TransactionCreateData,
  balanceChanges: AccountBalanceChange[],
): Promise<TransactionSummary> {
  void balanceChanges;
  return this.create(data);
}

async updateWithBalanceChanges(
  transactionId: string,
  data: TransactionUpdateData,
  balanceChanges: AccountBalanceChange[],
): Promise<TransactionSummary | null> {
  void balanceChanges;
  return this.update(transactionId, data);
}

async softDeleteWithBalanceChanges(
  transactionId: string,
  deletedAt: Date,
  balanceChanges: AccountBalanceChange[],
): Promise<{ deleted: true } | null> {
  void balanceChanges;
  return this.softDelete(transactionId, deletedAt);
}
```

- [ ] **Step 8: Run service tests to verify GREEN for create path**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts
```

Expected: PASS for create-related tests. Update/delete tests may still fail until Task 3 rewires their expectations and implementation.

---

## Task 3: Service TDD For Update And Delete Balance Changes

**Files:**
- Modify: `apps/api/src/transactions/transactions.service.spec.ts`
- Modify: `apps/api/src/transactions/transactions.service.ts`

- [ ] **Step 1: Update existing update/delete expectations**

Replace `repository.update` mock and expectations with `repository.updateWithBalanceChanges`. For simple merchant update, expect no balance deltas:

```ts
repository.updateWithBalanceChanges.mockResolvedValue({ ...transaction, merchant: '便利店' });

expect(repository.updateWithBalanceChanges).toHaveBeenCalledWith(
  'transaction_1',
  expect.objectContaining({ merchant: '便利店' }),
  [],
);
```

Replace `repository.softDelete` with `repository.softDeleteWithBalanceChanges`. For policy denial tests:

```ts
expect(repository.updateWithBalanceChanges).not.toHaveBeenCalled();
expect(repository.softDeleteWithBalanceChanges).not.toHaveBeenCalled();
```

- [ ] **Step 2: Add failing update amount test**

Add:

```ts
it('reverses old balance effect and applies new effect when updating amount', async () => {
  policy.canUpdateTransaction.mockResolvedValue(true);
  repository.findActiveById.mockResolvedValue(transaction);
  repository.updateWithBalanceChanges.mockResolvedValue({ ...transaction, amount: '120.00' });

  await service.updateTransaction('user_1', 'transaction_1', { amount: '120.00' });

  expect(repository.updateWithBalanceChanges).toHaveBeenCalledWith(
    'transaction_1',
    expect.objectContaining({ amount: '120.00' }),
    [
      { accountId: 'account_1', delta: '86.00' },
      { accountId: 'account_1', delta: '-120.00' },
    ],
  );
});
```

- [ ] **Step 3: Add failing update type test**

Add:

```ts
it('reverses old expense and applies new income when updating type', async () => {
  const incomeCategory: CategorySummary = {
    ...expenseCategory,
    id: 'category_income',
    type: 'income',
    name: '退款',
  };
  policy.canUpdateTransaction.mockResolvedValue(true);
  repository.findActiveById.mockResolvedValue(transaction);
  repository.findActiveCategoryById.mockResolvedValue(incomeCategory);
  repository.updateWithBalanceChanges.mockResolvedValue({
    ...transaction,
    type: 'income',
    categoryId: 'category_income',
  });

  await service.updateTransaction('user_1', 'transaction_1', {
    type: 'income',
    categoryId: 'category_income',
  });

  expect(repository.updateWithBalanceChanges).toHaveBeenCalledWith(
    'transaction_1',
    expect.objectContaining({ type: 'income', categoryId: 'category_income' }),
    [
      { accountId: 'account_1', delta: '86.00' },
      { accountId: 'account_1', delta: '86.00' },
    ],
  );
});
```

- [ ] **Step 4: Add failing update transfer target test**

Add:

```ts
it('reverses old transfer and applies new transfer target when updating transfer target', async () => {
  const transferTransaction: TransactionSummary = {
    ...transaction,
    type: 'transfer',
    categoryId: null,
    amount: '100.00',
    metadata: { transferTargetAccountId: 'account_2' },
  };
  policy.canUpdateTransaction.mockResolvedValue(true);
  policy.canViewAccount.mockResolvedValue(true);
  repository.findActiveById.mockResolvedValue(transferTransaction);
  repository.findActiveAccountById
    .mockResolvedValueOnce(account)
    .mockResolvedValueOnce({ ...account, id: 'account_3', name: '微信' });
  repository.updateWithBalanceChanges.mockResolvedValue({
    ...transferTransaction,
    metadata: { transferTargetAccountId: 'account_3' },
  });

  await service.updateTransaction('user_1', 'transaction_1', { transferTargetAccountId: 'account_3' });

  expect(repository.updateWithBalanceChanges).toHaveBeenCalledWith(
    'transaction_1',
    expect.objectContaining({ metadata: { transferTargetAccountId: 'account_3' } }),
    [
      { accountId: 'account_1', delta: '100.00' },
      { accountId: 'account_2', delta: '-100.00' },
      { accountId: 'account_1', delta: '-100.00' },
      { accountId: 'account_3', delta: '100.00' },
    ],
  );
});
```

- [ ] **Step 5: Add failing delete reversal test**

Update the existing delete test to first fetch the active transaction and expect reversal:

```ts
it('soft deletes a transaction and reverses its balance effect', async () => {
  policy.canUpdateTransaction.mockResolvedValue(true);
  repository.findActiveById.mockResolvedValue(transaction);
  repository.softDeleteWithBalanceChanges.mockResolvedValue({ deleted: true });

  await expect(service.deleteTransaction('user_1', 'transaction_1')).resolves.toEqual({ deleted: true });

  expect(policy.canUpdateTransaction).toHaveBeenCalledWith('user_1', 'transaction_1');
  expect(repository.findActiveById).toHaveBeenCalledWith('transaction_1');
  expect(repository.softDeleteWithBalanceChanges).toHaveBeenCalledWith('transaction_1', expect.any(Date), [
    { accountId: 'account_1', delta: '86.00' },
  ]);
});
```

- [ ] **Step 6: Run service tests to verify RED**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts
```

Expected: FAIL because update/delete still do not compute reversal and new balance changes.

- [ ] **Step 7: Implement update/delete balance changes**

In `apps/api/src/transactions/transactions.service.ts`, before building `updateData`, compute old and next effects.

Add helper:

```ts
function getTransferTargetAccountId(metadata?: Record<string, unknown> | null): string | undefined {
  return getExistingTransferTargetAccountId(metadata);
}

function transactionToBalanceEffect(transaction: TransactionSummary): BalanceEffect {
  return {
    accountId: transaction.accountId,
    type: transaction.type,
    amount: transaction.amount,
    transferTargetAccountId: getTransferTargetAccountId(transaction.metadata),
  };
}

function invertBalanceChanges(changes: AccountBalanceChange[]): AccountBalanceChange[] {
  return changes.map((change) => ({
    accountId: change.accountId,
    delta: negateDecimalString(change.delta),
  }));
}
```

In `updateTransaction`, after all account/category/metadata resolution is complete, build:

```ts
const oldBalanceChanges = buildBalanceChanges(transactionToBalanceEffect(transaction));
const nextBalanceChanges = buildBalanceChanges({
  accountId: updateData.accountId ?? transaction.accountId,
  type: updateData.type ?? transaction.type,
  amount: updateData.amount ?? transaction.amount,
  transferTargetAccountId: metadataUpdate?.transferTargetAccountId ?? getExistingTransferTargetAccountId(transaction.metadata),
});
const balanceChanges = [...invertBalanceChanges(oldBalanceChanges), ...nextBalanceChanges];
```

Then replace:

```ts
const updated = await this.transactionsRepository.update(transactionId, updateData);
```

with:

```ts
const updated = await this.transactionsRepository.updateWithBalanceChanges(transactionId, updateData, balanceChanges);
```

In `deleteTransaction`, replace direct soft delete with:

```ts
const transaction = await this.getActiveTransaction(transactionId);
const deleted = await this.transactionsRepository.softDeleteWithBalanceChanges(
  transactionId,
  new Date(),
  invertBalanceChanges(buildBalanceChanges(transactionToBalanceEffect(transaction))),
);
```

- [ ] **Step 8: Run service tests to verify GREEN**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit service behavior**

```bash
git add apps/api/src/transactions/transactions.service.spec.ts apps/api/src/transactions/transactions.service.ts apps/api/src/transactions/transactions.repository.ts
git commit -m "feat: compute transaction balance changes"
```

---

## Task 4: Repository TDD For Atomic Balance Writes

**Files:**
- Create: `apps/api/src/transactions/transactions.repository.spec.ts`
- Modify: `apps/api/src/transactions/transactions.repository.ts`

- [ ] **Step 1: Write failing repository create test**

Create `apps/api/src/transactions/transactions.repository.spec.ts`:

```ts
import { TransactionsRepository, type TransactionCreateData } from './transactions.repository';

const now = new Date('2026-05-18T10:00:00.000Z');

function decimal(value: string): { toString(): string } {
  return { toString: () => value };
}

describe('TransactionsRepository', () => {
  const transactionRecord = {
    id: 'transaction_1',
    ledgerId: 'ledger_1',
    accountId: 'account_1',
    categoryId: 'category_1',
    type: 'expense' as const,
    amount: decimal('86.00'),
    currency: 'CNY',
    occurredAt: now,
    merchant: '晚饭',
    note: null,
    visibility: 'ledger' as const,
    createdBy: 'user_1',
    source: 'manual' as const,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  };

  const createData: TransactionCreateData = {
    ledgerId: 'ledger_1',
    accountId: 'account_1',
    categoryId: 'category_1',
    type: 'expense',
    amount: '86.00',
    currency: 'CNY',
    occurredAt: now,
    merchant: '晚饭',
    note: null,
    visibility: 'ledger',
    createdBy: 'user_1',
    source: 'manual',
    metadata: null,
  };

  it('creates a transaction and increments account balances in one prisma transaction', async () => {
    const tx = {
      transaction: {
        create: jest.fn().mockResolvedValue(transactionRecord),
      },
      account: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new TransactionsRepository(prisma as never);

    await expect(
      repository.createWithBalanceChanges(createData, [{ accountId: 'account_1', delta: '-86.00' }]),
    ).resolves.toMatchObject({ id: 'transaction_1', amount: '86.00' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ledgerId: 'ledger_1',
        accountId: 'account_1',
        amount: '86.00',
      }),
    });
    expect(tx.account.updateMany).toHaveBeenCalledWith({
      where: { id: 'account_1', archivedAt: null },
      data: { currentBalance: { increment: '-86.00' } },
    });
  });
});
```

- [ ] **Step 2: Run repository test to verify RED**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.repository.spec.ts
```

Expected: FAIL because `createWithBalanceChanges` is still a stub that does not call `$transaction`.

- [ ] **Step 3: Implement transaction helper and real create method**

In `apps/api/src/transactions/transactions.repository.ts`, replace the stub with:

```ts
type TransactionClient = Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

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
```

- [ ] **Step 4: Run repository create test to verify GREEN**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.repository.spec.ts
```

Expected: PASS for the create transaction test.

- [ ] **Step 5: Add failing update and soft delete repository tests**

Append tests:

```ts
it('applies balance changes and updates a transaction in one prisma transaction', async () => {
  const tx = {
    transaction: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue({ ...transactionRecord, merchant: '便利店' }),
    },
    account: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new TransactionsRepository(prisma as never);

  await expect(
    repository.updateWithBalanceChanges('transaction_1', { merchant: '便利店' }, [
      { accountId: 'account_1', delta: '86.00' },
      { accountId: 'account_1', delta: '-120.00' },
    ]),
  ).resolves.toMatchObject({ merchant: '便利店' });

  expect(tx.account.updateMany).toHaveBeenNthCalledWith(1, {
    where: { id: 'account_1', archivedAt: null },
    data: { currentBalance: { increment: '86.00' } },
  });
  expect(tx.transaction.updateMany).toHaveBeenCalledWith({
    where: { id: 'transaction_1', deletedAt: null },
    data: expect.objectContaining({ merchant: '便利店' }),
  });
  expect(tx.account.updateMany).toHaveBeenNthCalledWith(2, {
    where: { id: 'account_1', archivedAt: null },
    data: { currentBalance: { increment: '-120.00' } },
  });
});

it('returns null when update does not affect an active transaction', async () => {
  const tx = {
    transaction: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn(),
    },
    account: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new TransactionsRepository(prisma as never);

  await expect(repository.updateWithBalanceChanges('missing', { merchant: '便利店' }, [])).resolves.toBeNull();

  expect(tx.transaction.findFirst).not.toHaveBeenCalled();
});

it('reverses balance changes and soft deletes in one prisma transaction', async () => {
  const deletedAt = new Date('2026-05-19T00:00:00.000Z');
  const tx = {
    transaction: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    account: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new TransactionsRepository(prisma as never);

  await expect(
    repository.softDeleteWithBalanceChanges('transaction_1', deletedAt, [{ accountId: 'account_1', delta: '86.00' }]),
  ).resolves.toEqual({ deleted: true });

  expect(tx.account.updateMany).toHaveBeenCalledWith({
    where: { id: 'account_1', archivedAt: null },
    data: { currentBalance: { increment: '86.00' } },
  });
  expect(tx.transaction.updateMany).toHaveBeenCalledWith({
    where: { id: 'transaction_1', deletedAt: null },
    data: { deletedAt },
  });
});
```

- [ ] **Step 6: Run repository tests to verify RED**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.repository.spec.ts
```

Expected: FAIL because update/delete transaction methods are still stubs.

- [ ] **Step 7: Implement update/delete transaction methods**

In `apps/api/src/transactions/transactions.repository.ts`, implement:

```ts
async updateWithBalanceChanges(
  transactionId: string,
  data: TransactionUpdateData,
  balanceChanges: AccountBalanceChange[],
): Promise<TransactionSummary | null> {
  return this.prisma.$transaction(async (tx) => {
    await applyBalanceChanges(tx, balanceChanges);
    const updateData = toTransactionUpdateInput(data);
    const result = await tx.transaction.updateMany({
      where: {
        id: transactionId,
        deletedAt: null,
      },
      data: updateData,
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
```

Extract the repeated update-data object from `update` into:

```ts
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
```

Then update the existing `update` method to use `toTransactionUpdateInput(data)`.

- [ ] **Step 8: Run repository tests to verify GREEN**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.repository.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Run combined transaction tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts transactions.repository.spec.ts
```

Expected: PASS.

- [ ] **Step 10: Commit repository behavior**

```bash
git add apps/api/src/transactions/transactions.repository.spec.ts apps/api/src/transactions/transactions.repository.ts apps/api/src/transactions/transactions.service.ts apps/api/src/transactions/transactions.service.spec.ts
git commit -m "feat: apply transaction balance updates atomically"
```

---

## Task 5: Final Verification And Handoff Docs

**Files:**
- Modify if needed: `docs/handover/开发交接说明.md`
- Modify if needed: `.agents/project-context.md`

- [ ] **Step 1: Update handoff status**

In `docs/handover/开发交接说明.md`, update the current engineering state after M2 balance linking is complete:

```txt
- M2 账户余额流水联动已完成：正式流水创建、更新和软删除会在同一个 Prisma transaction 内调整相关账户 `current_balance`，支持收入、支出和单条转账模型；余额重算和余额变动台账保留为后续扩展。
```

- [ ] **Step 2: Update quick project context**

In `.agents/project-context.md`, update the API state bullet:

```txt
- `apps/api` 已创建，当前包含 NestJS 11、Prisma 7、`@nestjs/config`、PrismaService、认证与会话、JWT Guard、用户模块、账本模块、成员角色管理、Ledger Policy 层、账户、分类、流水 API，以及 M2 账户余额流水联动。
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
pnpm --filter @bookkeeping/shared-types build
pnpm --filter @bookkeeping/api prisma:generate
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts transactions.repository.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Run package verification**

Run:

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: all PASS.

- [ ] **Step 5: Run workspace verification**

Run:

```bash
pnpm build
pnpm test
git diff --check
```

Expected: all PASS and `git diff --check` produces no output.

- [ ] **Step 6: Review requirement coverage**

Check the implementation against `docs/superpowers/specs/2026-05-19-m2-account-balance-linking-design.md`:

```bash
rg -n "current_balance|createWithBalanceChanges|updateWithBalanceChanges|softDeleteWithBalanceChanges|Transfer target account must be different" apps/api/src docs/modules .agents/project-context.md docs/handover/开发交接说明.md
```

Expected: matches show docs and implementation for balance linking, transaction methods, and same-account transfer rejection.

- [ ] **Step 7: Commit handoff and verification docs**

```bash
git add docs/handover/开发交接说明.md .agents/project-context.md docs/modules/accounts/账户说明.md docs/modules/transactions/流水说明.md
git commit -m "docs: update m2 balance handoff"
```

---

## Self-Review

- Spec coverage: The plan covers docs-first rules, create/update/delete balance linking, Decimal-safe service deltas, same-account transfer rejection, repository-level Prisma transactions, tests, and final handoff updates.
- Placeholder scan: No placeholder markers or incomplete sections are intentionally left in this plan.
- Type consistency: Repository method names are consistently `createWithBalanceChanges`, `updateWithBalanceChanges`, and `softDeleteWithBalanceChanges`; balance change shape is consistently `{ accountId: string; delta: string }`.
