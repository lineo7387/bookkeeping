# M1.5 Accounts Categories Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the M1.5 backend foundation for ledger-scoped accounts, categories, and transactions, including private visibility rules and Policy-layer authorization.

**Architecture:** Keep the existing NestJS modular-monolith shape: feature modules own their controllers, DTOs, services, repositories, and tests. Controllers only translate HTTP input/output, services coordinate business workflows, repositories encapsulate Prisma access, and `LedgerPolicyService` remains the single authorization source. No frontend-to-FastAPI path is introduced.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL Decimal fields, Jest, `class-validator`, `class-transformer`, `@bookkeeping/shared-types`, pnpm workspace.

---

## Current State Checked

- Branch: `main`
- Latest commit: `9024d37 docs: sync m1 agent handoff context`
- Working tree before this plan: clean
- Existing completed scope: M0 and M1 are present on `main`.

## Chinese Docs Created For This Scope

- `docs/modules/accounts/账户说明.md`
- `docs/modules/categories/分类说明.md`
- `docs/modules/transactions/流水说明.md`

## Implementation Boundaries

- Do not create new project scaffolds in this milestone.
- Do not modify admin-web or mobile UI in M1.5.
- Do not call FastAPI directly from any frontend or shared client.
- Do not create formal transactions from AI candidates in this milestone.
- Keep `selected_members` in the transaction enum and API type vocabulary, but do not open selected-member creation until a membership authorization table is designed.
- Use Decimal strings at the HTTP boundary and Prisma Decimal in persistence.
- Use soft deletion: `accounts.archived_at`, `categories.archived_at`, `transactions.deleted_at`.

## File Structure Map

### Prisma and Shared Types

- Modify `apps/api/prisma/schema.prisma`: add account/category/transaction enums, models, relations, indexes.
- Modify `packages/shared-types/src/index.ts`: add account, category, transaction summary/input-facing types and missing error codes if needed.

### Policy Layer

- Modify `apps/api/src/policies/ledger-policy.service.ts`: implement `canViewAccount`, `canViewTransaction`, `canUpdateTransaction`; add helpers for active member lookup reuse.
- Modify `apps/api/src/policies/ledger-policy.service.spec.ts`: cover shared/private account and transaction visibility/update cases.
- Optionally modify `apps/api/src/common/guards/ledger-policy.decorator.ts` and `apps/api/src/common/guards/ledger-policy.guard.ts` only if route-level account/transaction policies are added; otherwise keep resource-specific checks in services through `LedgerPolicyService`.

### Accounts Module

- Create `apps/api/src/accounts/accounts.module.ts`
- Create `apps/api/src/accounts/accounts.controller.ts`
- Create `apps/api/src/accounts/accounts.service.ts`
- Create `apps/api/src/accounts/accounts.repository.ts`
- Create `apps/api/src/accounts/dto/create-account.dto.ts`
- Create `apps/api/src/accounts/dto/update-account.dto.ts`
- Create `apps/api/src/accounts/accounts.controller.spec.ts`
- Create `apps/api/src/accounts/accounts.service.spec.ts`

### Categories Module

- Create `apps/api/src/categories/categories.module.ts`
- Create `apps/api/src/categories/categories.controller.ts`
- Create `apps/api/src/categories/categories.service.ts`
- Create `apps/api/src/categories/categories.repository.ts`
- Create `apps/api/src/categories/dto/create-category.dto.ts`
- Create `apps/api/src/categories/dto/update-category.dto.ts`
- Create `apps/api/src/categories/dto/list-categories-query.dto.ts`
- Create `apps/api/src/categories/categories.controller.spec.ts`
- Create `apps/api/src/categories/categories.service.spec.ts`

### Transactions Module

- Create `apps/api/src/transactions/transactions.module.ts`
- Create `apps/api/src/transactions/transactions.controller.ts`
- Create `apps/api/src/transactions/transactions.service.ts`
- Create `apps/api/src/transactions/transactions.repository.ts`
- Create `apps/api/src/transactions/dto/create-transaction.dto.ts`
- Create `apps/api/src/transactions/dto/update-transaction.dto.ts`
- Create `apps/api/src/transactions/dto/list-transactions-query.dto.ts`
- Create `apps/api/src/transactions/transactions.controller.spec.ts`
- Create `apps/api/src/transactions/transactions.service.spec.ts`

### App Wiring

- Modify `apps/api/src/app.module.ts`: import `AccountsModule`, `CategoriesModule`, `TransactionsModule`.
- Modify `docs/modules/api/NestJS服务说明.md`: mark M1.5 docs and module direction after implementation completes.
- Modify `docs/modules/shared-packages/共享包说明.md`: document new shared type exports after implementation completes.

## Task 1: Prisma Domain Model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Write the failing schema expectation**

Run:

```bash
pnpm --filter @bookkeeping/api prisma:generate
```

Expected before implementation: Prisma Client does not expose `account`, `category`, or `transaction` delegates.

- [ ] **Step 2: Add enums**

Add Prisma enums:

```txt
AccountType: cash | bank_card | alipay | wechat | credit_card | other
ResourceVisibility: ledger | private | selected_members
CategoryType: income | expense
TransactionType: income | expense | transfer
TransactionSource: manual | ai_text | ocr | import
```

Implementation note: accounts use only `ledger` and `private`; transactions use all three visibility values. A single `ResourceVisibility` enum keeps naming aligned across private resources.

- [ ] **Step 3: Add models and relations**

Add `Account`, `Category`, and `Transaction` models with the fields from the module docs. Add relations:

```txt
Ledger.accounts
Ledger.categories
Ledger.transactions
User.ownedAccounts
User.createdTransactions
Account.transactions
Category.transactions
Category.parent / Category.children
```

- [ ] **Step 4: Generate Prisma Client**

Run:

```bash
pnpm --filter @bookkeeping/api prisma:generate
```

Expected: command succeeds and generated client includes the three new delegates.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat: add m15 bookkeeping prisma models"
```

## Task 2: Shared Types

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify after implementation: `docs/modules/shared-packages/共享包说明.md`

- [ ] **Step 1: Write type usage expectations**

Run:

```bash
pnpm --filter @bookkeeping/shared-types build
```

Expected before implementation: no exported account/category summary types exist for API consumers.

- [ ] **Step 2: Export account types**

Add:

```ts
export type AccountType = 'cash' | 'bank_card' | 'alipay' | 'wechat' | 'credit_card' | 'other';
export type AccountVisibility = 'ledger' | 'private';

export interface AccountSummary {
  id: string;
  ledgerId: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: string;
  currentBalance: string;
  visibility: AccountVisibility;
  ownerId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Export category types**

Add:

```ts
export type CategoryType = 'income' | 'expense';

export interface CategorySummary {
  id: string;
  ledgerId: string;
  parentId: string | null;
  type: CategoryType;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Export transaction summary types**

Extend existing transaction types with:

```ts
export type TransactionSource = 'manual' | 'ai_text' | 'ocr' | 'import';

export interface TransactionSummary {
  id: string;
  ledgerId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  occurredAt: string;
  merchant: string | null;
  note: string | null;
  visibility: TransactionVisibility;
  createdBy: string;
  source: TransactionSource;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 5: Build shared types**

Run:

```bash
pnpm --filter @bookkeeping/shared-types build
```

Expected: build passes.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/index.ts docs/modules/shared-packages/共享包说明.md
git commit -m "feat: add shared bookkeeping resource types"
```

## Task 3: Policy Tests First

**Files:**
- Modify: `apps/api/src/policies/ledger-policy.service.spec.ts`
- Modify later: `apps/api/src/policies/ledger-policy.service.ts`

- [ ] **Step 1: Add failing account policy tests**

Cover:

```txt
shared account is visible to active ledger member
private account is visible only to owner_id
archived account is denied
removed ledger member cannot view shared account
```

- [ ] **Step 2: Add failing transaction policy tests**

Cover:

```txt
shared transaction is visible to active ledger member
private transaction is visible only to created_by
owner/admin can update shared transaction
editor can update own shared transaction only
viewer cannot update shared transaction
private transaction can be updated only by created_by
deleted transaction is denied
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledger-policy.service.spec.ts
```

Expected: tests fail because policy methods still return `false`.

- [ ] **Step 4: Commit tests**

```bash
git add apps/api/src/policies/ledger-policy.service.spec.ts
git commit -m "test: cover private bookkeeping policies"
```

## Task 4: Policy Implementation

**Files:**
- Modify: `apps/api/src/policies/ledger-policy.service.ts`

- [ ] **Step 1: Implement `canViewAccount`**

Rules:

```txt
account missing or archived -> false
visibility private -> account.ownerId === userId
visibility ledger -> active ledger member can view
```

- [ ] **Step 2: Implement `canViewTransaction`**

Rules:

```txt
transaction missing or deleted -> false
visibility private -> transaction.createdBy === userId
visibility ledger -> active ledger member can view
visibility selected_members -> false in M1.5 until member grants exist
```

- [ ] **Step 3: Implement `canUpdateTransaction`**

Rules:

```txt
transaction missing or deleted -> false
private -> created_by only
ledger -> owner/admin can update; editor only if created_by matches; viewer cannot update
selected_members -> false in M1.5 until member grants exist
```

- [ ] **Step 4: Run policy tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledger-policy.service.spec.ts
```

Expected: policy tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/policies/ledger-policy.service.ts apps/api/src/policies/ledger-policy.service.spec.ts
git commit -m "feat: enforce private resource policies"
```

## Task 5: Accounts API With TDD

**Files:**
- Create: `apps/api/src/accounts/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing service tests**

Cover:

```txt
list returns only visible accounts
create shared account requires ledger management
create private account stores owner_id as current user
update private account is allowed only for owner
delete archives account instead of removing it
```

- [ ] **Step 2: Write failing controller tests**

Cover routes:

```txt
GET /ledgers/:ledgerId/accounts
POST /ledgers/:ledgerId/accounts
PATCH /accounts/:accountId
DELETE /accounts/:accountId
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- accounts.service.spec.ts accounts.controller.spec.ts
```

Expected: fails because Accounts module does not exist.

- [ ] **Step 4: Implement DTOs, repository, service, controller, and module**

Constraints:

```txt
DTOs validate enum values, Decimal string shape, names, currency, visibility, sort_order
repository maps Prisma Decimal to string summaries
service calls LedgerPolicyService for all permission checks
controller wraps responses with ok(...)
```

- [ ] **Step 5: Wire module**

Import `AccountsModule` in `apps/api/src/app.module.ts`.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- accounts.service.spec.ts accounts.controller.spec.ts ledger-policy.service.spec.ts
```

Expected: all listed tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/accounts apps/api/src/app.module.ts
git commit -m "feat: add ledger account api"
```

## Task 6: Categories API With TDD

**Files:**
- Create: `apps/api/src/categories/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing service tests**

Cover:

```txt
list categories checks ledger view access
create category requires ledger management
parent category must belong to same ledger and type
category cannot use itself as parent
system category cannot be deleted
category with active children cannot be deleted
delete archives category
```

- [ ] **Step 2: Write failing controller tests**

Cover routes:

```txt
GET /ledgers/:ledgerId/categories
POST /ledgers/:ledgerId/categories
PATCH /categories/:categoryId
DELETE /categories/:categoryId
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- categories.service.spec.ts categories.controller.spec.ts
```

Expected: fails because Categories module does not exist.

- [ ] **Step 4: Implement DTOs, repository, service, controller, and module**

Constraints:

```txt
DTOs validate income/expense, parent_id, icon, color, sort_order
repository filters archived_at null by default
service keeps parent validation and system-delete checks
controller wraps responses with ok(...)
```

- [ ] **Step 5: Wire module**

Import `CategoriesModule` in `apps/api/src/app.module.ts`.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- categories.service.spec.ts categories.controller.spec.ts
```

Expected: all listed tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/categories apps/api/src/app.module.ts
git commit -m "feat: add ledger category api"
```

## Task 7: Transactions API With TDD

**Files:**
- Create: `apps/api/src/transactions/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing service tests**

Cover:

```txt
list returns only visible ledger transactions
create requires canCreateTransaction
create validates account visibility through canViewAccount
private account defaults transaction visibility to private
expense/income requires matching category type
transfer stores target account data in metadata
get requires canViewTransaction
update requires canUpdateTransaction
delete sets deleted_at
```

- [ ] **Step 2: Write failing controller tests**

Cover routes:

```txt
GET /ledgers/:ledgerId/transactions
POST /ledgers/:ledgerId/transactions
GET /transactions/:transactionId
PATCH /transactions/:transactionId
DELETE /transactions/:transactionId
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts transactions.controller.spec.ts
```

Expected: fails because Transactions module does not exist.

- [ ] **Step 4: Implement DTOs, repository, service, controller, and module**

Constraints:

```txt
DTOs validate Decimal string amount, ISO occurred_at, enums, UUID-like ids as strings, optional merchant/note
repository filters deleted_at null by default
service uses Prisma transaction for transaction creation plus account balance update when balance maintenance is included
service keeps transfer details behind one method so future double-entry migration does not change controller contract
controller wraps responses with ok(...)
```

- [ ] **Step 5: Wire module**

Import `TransactionsModule` in `apps/api/src/app.module.ts`.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts transactions.controller.spec.ts ledger-policy.service.spec.ts
```

Expected: all listed tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/transactions apps/api/src/app.module.ts
git commit -m "feat: add ledger transaction api"
```

## Task 8: Documentation Sync

**Files:**
- Modify: `docs/modules/accounts/账户说明.md`
- Modify: `docs/modules/categories/分类说明.md`
- Modify: `docs/modules/transactions/流水说明.md`
- Modify: `docs/modules/api/NestJS服务说明.md`
- Modify: `.agents/project-context.md`
- Modify: `docs/handover/开发交接说明.md`

- [ ] **Step 1: Update module docs from planning to implemented state**

Record exact API behavior, final permission decisions, test commands, and any deliberate M1.5 limitations.

- [ ] **Step 2: Update handoff context**

Add M1.5 status and next recommended directions.

- [ ] **Step 3: Commit**

```bash
git add docs/modules/accounts/账户说明.md docs/modules/categories/分类说明.md docs/modules/transactions/流水说明.md docs/modules/api/NestJS服务说明.md .agents/project-context.md docs/handover/开发交接说明.md
git commit -m "docs: document m15 bookkeeping modules"
```

## Task 9: Final Verification

**Files:**
- No new files; run validation commands.

- [ ] **Step 1: Run API tests**

```bash
pnpm --filter @bookkeeping/api test
```

Expected: all API tests pass.

- [ ] **Step 2: Run API typecheck**

```bash
pnpm --filter @bookkeeping/api typecheck
```

Expected: TypeScript check passes.

- [ ] **Step 3: Run API build**

```bash
pnpm --filter @bookkeeping/api build
```

Expected: NestJS build passes.

- [ ] **Step 4: Run workspace build**

```bash
pnpm build
```

Expected: all workspace builds pass.

- [ ] **Step 5: Check whitespace**

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 6: Review changed files**

```bash
git status --short
git diff --stat
```

Expected: only M1.5 code and docs are changed.

## Self-Review

- Spec coverage: accounts, categories, transactions, Decimal amounts, ledger ownership, private visibility, soft deletion, and policy boundaries are covered.
- Placeholder scan: no placeholder or deferred implementation wording is used as task content.
- Type consistency: shared types use camelCase API-facing names; Prisma model fields map snake_case database names through existing Prisma conventions.
- Known limitation: `selected_members` remains modeled but not open for creation until the member-grant table is planned.
