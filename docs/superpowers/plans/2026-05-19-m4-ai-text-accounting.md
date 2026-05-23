# M4 AI Text Accounting Implementation Plan

> **Status:** 已完成的历史计划，仅供追溯和复盘。不要按本文继续执行 M4 首版；继续开发时应以当前代码、模块文档和最新交接说明为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build M4 AI text accounting so natural-language input creates an AI candidate, and only user confirmation creates a formal transaction.

**Architecture:** NestJS remains the only public business API and owns authentication, Ledger Policy checks, AI task persistence, candidate confirmation, and formal transaction creation. FastAPI is internal-only and only returns structured candidate results. `apps/ai-service` has now been scaffolded by the user with `uv` and includes the M4 deterministic text parser contract.

**Tech Stack:** NestJS 11, Prisma 7, Jest, class-validator, `@bookkeeping/shared-types`, `@bookkeeping/api-client`, FastAPI, Pydantic, pytest.

**Completion note on 2026-05-20:** M4 AI text accounting was implemented and committed locally as `9de7668 feat: add m4 ai text accounting`. The work added `ai_tasks` / `ai_extractions`, `AiModule`, internal FastAPI client, candidate save/confirm/reject flow, `source = ai_text` transaction creation through NestJS, real Admin AI task summaries, shared contracts, API client coverage, and Chinese documentation updates. Final verification passed before commit: Prisma generate, API test/typecheck/build, shared-types build, api-client test/build, workspace build/test, `git diff --check`, and `cd apps/ai-service && uv run pytest`.

---

## Scope

M4 route scope:

- `POST /ledgers/:ledgerId/ai/text-parse`
- `GET /ledgers/:ledgerId/ai/tasks`
- `GET /ai/tasks/:taskId`
- `POST /ai/extractions/:extractionId/confirm`
- `POST /ai/extractions/:extractionId/reject`
- `GET /admin/ai/tasks` reads real AI task summaries instead of the M3 empty stand-in response.

Explicitly out of scope:

- Receipt OCR, uploads, object storage, BullMQ, WebSocket, mobile pages, and admin write operations.
- Frontend or `@bookkeeping/api-client` direct calls to FastAPI.
- FastAPI creating formal transactions or reading the main PostgreSQL business tables.

## File Structure

- Documentation:
  - Created: `docs/modules/ai/AI文本记账说明.md`
  - Modify: `docs/modules/api/NestJS服务说明.md`
  - Modify: `docs/modules/shared-packages/共享包说明.md`
  - Modify: `docs/handover/开发交接说明.md`
  - Modify: `.codex/project-context.md`

- Prisma and NestJS AI module:
  - Modify: `apps/api/prisma/schema.prisma`
  - Create: `apps/api/src/ai/ai.module.ts`
  - Create: `apps/api/src/ai/ai.controller.ts`
  - Create: `apps/api/src/ai/ai.service.ts`
  - Create: `apps/api/src/ai/ai.repository.ts`
  - Create: `apps/api/src/ai/ai-internal-client.ts`
  - Create: `apps/api/src/ai/ai.mapper.ts`
  - Create: `apps/api/src/ai/ai.types.ts`
  - Create: `apps/api/src/ai/dto/parse-ai-text.dto.ts`
  - Create: `apps/api/src/ai/dto/list-ai-tasks-query.dto.ts`
  - Create: `apps/api/src/ai/dto/confirm-ai-extraction.dto.ts`
  - Create: `apps/api/src/ai/dto/reject-ai-extraction.dto.ts`
  - Create tests beside module files.
  - Modify: `apps/api/src/app.module.ts`
  - Modify: `apps/api/src/transactions/transactions.service.ts` or repository API only as needed to allow trusted internal creation with `source = ai_text`.

- Admin API:
  - Modify: `apps/api/src/admin/admin.repository.ts`
  - Modify: `apps/api/src/admin/admin.service.ts`
  - Modify: `apps/api/src/admin/admin.service.spec.ts`

- Shared packages:
  - Modify: `packages/shared-types/src/index.ts`
  - Modify: `packages/api-client/src/index.ts`
  - Add or extend: `packages/api-client/test/*.test.mjs`

- FastAPI service after user scaffolds `apps/ai-service`:
  - Create: `apps/ai-service/app/main.py`
  - Create: `apps/ai-service/app/core/config.py`
  - Create: `apps/ai-service/app/api/routes/text_transactions.py`
  - Create: `apps/ai-service/app/schemas/text_transactions.py`
  - Create: `apps/ai-service/app/services/text_transaction_parser.py`
  - Create: `apps/ai-service/tests/test_text_transactions.py`
  - Modify: `apps/ai-service/AGENTS.md` only if local rules need clarification.

## Task 1: Document And Baseline

**Files:**
- Existing: `AGENTS.md`
- Existing: `.codex/project-context.md`
- Existing: `.codex/development-rules.md`
- Existing: `.codex/ai-service-guidelines.md`
- Existing: `.codex/scaffolding-protocol.md`
- Existing: `docs/modules/ai/AI文本记账说明.md`
- Existing: `docs/modules/ai-service/AI服务规范.md`
- Existing: `docs/modules/transactions/流水说明.md`
- Existing: `apps/api/AGENTS.md`
- Existing: `packages/shared-types/AGENTS.md`
- Existing: `packages/api-client/AGENTS.md`

- [x] **Step 1: Confirm branch and clean status**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: current branch is `codex/m4-ai-text-accounting`; worktree is clean before implementation.

- [x] **Step 2: Run baseline verification**

Run:

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm --filter @bookkeeping/api-client test
pnpm build
pnpm test
git diff --check
```

Expected: all commands exit 0 before M4 code changes.

- [x] **Step 3: Commit documentation baseline if needed**

Run:

```bash
git add docs/modules/ai/AI文本记账说明.md docs/superpowers/plans/2026-05-19-m4-ai-text-accounting.md
git commit -m "docs: add m4 ai text accounting plan"
```

Expected: commit succeeds locally. Do not push unless the user explicitly asks.

## Task 2: Prisma AI Task And Extraction Models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/ai/ai.repository.spec.ts`
- Create: `apps/api/src/ai/ai.repository.ts`
- Modify: `docs/modules/ai/AI文本记账说明.md` if schema names change during implementation.

- [x] **Step 1: Add failing repository test**

Create `apps/api/src/ai/ai.repository.spec.ts`:

```ts
import { AiRepository } from './ai.repository';

describe('AiRepository', () => {
  it('creates a text parse task and pending extraction', async () => {
    const prisma = {
      aiTask: {
        create: jest.fn().mockResolvedValue({
          id: 'task_1',
          ledgerId: 'ledger_1',
          userId: 'user_1',
          type: 'text_parse',
          status: 'processing',
          inputText: '今天晚饭花了86，微信支付',
          inputFileUrl: null,
          errorMessage: null,
          createdAt: new Date('2026-05-19T11:00:00.000Z'),
          updatedAt: new Date('2026-05-19T11:00:00.000Z'),
        }),
      },
      aiExtraction: {
        create: jest.fn().mockResolvedValue({
          id: 'extraction_1',
          aiTaskId: 'task_1',
          ledgerId: 'ledger_1',
          userId: 'user_1',
          rawResult: { provider: 'stub' },
          suggestedTransaction: {
            ledgerId: 'ledger_1',
            type: 'expense',
            amount: '86.00',
            currency: 'CNY',
            occurredAt: '2026-05-19T11:00:00.000Z',
            visibility: 'ledger',
            categoryName: '餐饮',
            accountHint: '微信',
            merchant: null,
            note: '晚饭',
            confidence: 0.91,
          },
          confidence: '0.91',
          status: 'pending',
          createdAt: new Date('2026-05-19T11:00:00.000Z'),
          updatedAt: new Date('2026-05-19T11:00:00.000Z'),
        }),
      },
    };
    const repository = new AiRepository(prisma as never);

    await expect(
      repository.createTextParseTask({
        ledgerId: 'ledger_1',
        userId: 'user_1',
        inputText: '今天晚饭花了86，微信支付',
      }),
    ).resolves.toMatchObject({ id: 'task_1', status: 'processing' });
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.repository.spec.ts
```

Expected before implementation: FAIL because `AiRepository` does not exist.

- [x] **Step 2: Add Prisma enums and models**

Modify `apps/api/prisma/schema.prisma` with:

```prisma
enum AiTaskType {
  text_parse
  receipt_ocr
  classify
  insight
}

enum AiTaskStatus {
  pending
  processing
  succeeded
  failed
}

enum AiExtractionStatus {
  pending
  confirmed
  rejected
}
```

Add relations to `Ledger`:

```prisma
  aiTasks      AiTask[]
  aiExtractions AiExtraction[]
```

Add relations to `User`:

```prisma
  aiTasks      AiTask[]
  aiExtractions AiExtraction[]
```

Add models:

```prisma
model AiTask {
  id           String       @id @default(uuid())
  ledgerId     String       @map("ledger_id")
  userId       String       @map("user_id")
  type         AiTaskType
  status       AiTaskStatus @default(pending)
  inputText    String?      @map("input_text")
  inputFileUrl String?      @map("input_file_url")
  errorMessage String?      @map("error_message")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")
  ledger       Ledger       @relation(fields: [ledgerId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  extractions  AiExtraction[]

  @@index([ledgerId, status])
  @@index([userId, createdAt])
  @@map("ai_tasks")
}

model AiExtraction {
  id                   String             @id @default(uuid())
  aiTaskId             String             @map("ai_task_id")
  ledgerId             String             @map("ledger_id")
  userId               String             @map("user_id")
  rawResult            Json               @map("raw_result") @db.JsonB
  suggestedTransaction Json               @map("suggested_transaction") @db.JsonB
  confidence           Decimal            @db.Decimal(5, 4)
  status               AiExtractionStatus @default(pending)
  createdAt            DateTime           @default(now()) @map("created_at")
  updatedAt            DateTime           @updatedAt @map("updated_at")
  aiTask               AiTask             @relation(fields: [aiTaskId], references: [id], onDelete: Cascade)
  ledger               Ledger             @relation(fields: [ledgerId], references: [id], onDelete: Cascade)
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([aiTaskId])
  @@index([ledgerId, status])
  @@index([userId, status])
  @@map("ai_extractions")
}
```

Run:

```bash
pnpm --filter @bookkeeping/api prisma:generate
```

Expected: Prisma client regenerates successfully.

- [x] **Step 3: Implement repository methods**

Create `apps/api/src/ai/ai.repository.ts` with methods:

```ts
createTextParseTask(data: { ledgerId: string; userId: string; inputText: string })
markTaskSucceeded(taskId: string)
markTaskFailed(taskId: string, errorMessage: string)
createExtraction(data: CreateAiExtractionData)
findTaskForUser(taskId: string, userId: string)
listTasksForLedgerUser(ledgerId: string, userId: string, query: { limit: number; offset: number })
findPendingExtractionForUser(extractionId: string, userId: string)
confirmExtractionInTransaction(data: {
  extractionId: string;
  userId: string;
  transactionId: string;
})
rejectExtraction(extractionId: string, userId: string, reason?: string)
```

Keep Prisma querying in the repository. Do not put Ledger Policy checks here.

- [x] **Step 4: Verify repository tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.repository.spec.ts
```

Expected: PASS.

## Task 3: NestJS AI DTOs, Internal Client, Service, And Controller

**Files:**
- Create: `apps/api/src/ai/dto/parse-ai-text.dto.ts`
- Create: `apps/api/src/ai/dto/list-ai-tasks-query.dto.ts`
- Create: `apps/api/src/ai/dto/confirm-ai-extraction.dto.ts`
- Create: `apps/api/src/ai/dto/reject-ai-extraction.dto.ts`
- Create: `apps/api/src/ai/ai.types.ts`
- Create: `apps/api/src/ai/ai.mapper.ts`
- Create: `apps/api/src/ai/ai-internal-client.ts`
- Create: `apps/api/src/ai/ai.service.spec.ts`
- Create: `apps/api/src/ai/ai.service.ts`
- Create: `apps/api/src/ai/ai.controller.spec.ts`
- Create: `apps/api/src/ai/ai.controller.ts`
- Create: `apps/api/src/ai/ai.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [x] **Step 1: Write DTO tests**

Create `apps/api/src/ai/ai.dto.spec.ts` covering:

```ts
it('rejects empty input text');
it('rejects input text longer than 500 characters');
it('accepts optional locale timezone and defaultCurrency');
it('rejects source in confirm payloads');
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.dto.spec.ts
```

Expected before DTO implementation: FAIL.

- [x] **Step 2: Implement DTOs**

Implement:

```ts
export class ParseAiTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  inputText!: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}
```

Confirm DTO must allow only `ledgerId`, `accountId`, `categoryId`, `amount`, `occurredAt`, `visibility`, and `note`. It must not expose `source`.

- [x] **Step 3: Write service tests**

Create `apps/api/src/ai/ai.service.spec.ts` covering:

```ts
it('creates a task and extraction but does not create a transaction during text parse');
it('marks the task failed when the internal AI client throws');
it('confirms a pending extraction by creating source ai_text transaction');
it('rejects a pending extraction without creating a transaction');
it('does not allow non-creator access to an extraction');
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.service.spec.ts
```

Expected before implementation: FAIL.

- [x] **Step 4: Implement internal client and service**

Implement `AiInternalClient` as a small injectable wrapper around `fetch` with `AI_SERVICE_BASE_URL` from config. It calls only:

```txt
POST /internal/ai/text-transaction
```

Implement `AiService` so:

- It calls `LedgerPolicyService.canCreateTransaction(userId, ledgerId)` before creating a text parse task.
- It creates an `ai_task` with `processing`.
- It sends only minimal context to FastAPI.
- It saves an `ai_extraction` with `pending`.
- It marks the task `succeeded` after extraction save.
- It marks the task `failed` and throws `AI_TASK_FAILED` if FastAPI fails.
- It confirms candidates by calling a trusted transaction creation path with `source = ai_text`.
- It rejects candidates by setting status to `rejected`.

- [x] **Step 5: Write controller tests**

Create `apps/api/src/ai/ai.controller.spec.ts` covering:

```ts
it('wraps parseAiText result in ApiResponse success');
it('passes req.user.id into service methods');
it('exposes confirm and reject extraction routes');
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.controller.spec.ts
```

Expected before controller implementation: FAIL.

- [x] **Step 6: Implement controller and module**

Routes:

```txt
POST /ledgers/:ledgerId/ai/text-parse
GET /ledgers/:ledgerId/ai/tasks
GET /ai/tasks/:taskId
POST /ai/extractions/:extractionId/confirm
POST /ai/extractions/:extractionId/reject
```

All routes use `JwtAuthGuard`. Register `AiModule` in `AppModule`.

- [x] **Step 7: Verify AI module**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.dto.spec.ts ai.repository.spec.ts ai.service.spec.ts ai.controller.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: all commands exit 0.

## Task 4: Transaction Confirmation Path

**Files:**
- Modify: `apps/api/src/transactions/transactions.service.ts`
- Modify: `apps/api/src/transactions/transactions.repository.ts`
- Modify: `apps/api/src/transactions/transactions.service.spec.ts`
- Modify: `docs/modules/transactions/流水说明.md`

- [x] **Step 1: Write failing transaction service test**

Add a test proving internal AI confirmation can create a transaction with `source = ai_text` while public create DTO still rejects `source`.

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts transactions.dto.spec.ts
```

Expected before implementation: FAIL for the new internal source test; existing public DTO test still passes.

- [x] **Step 2: Add trusted internal creation method**

Add a service method such as:

```ts
createFromAiExtraction(userId: string, input: CreateTransactionFromAiInput)
```

This method must:

- Reuse existing account, category, visibility, transfer, Decimal, and UTC validation.
- Force `source = 'ai_text'`.
- Preserve account balance transaction behavior.
- Not expose `source` to public controller DTOs.

- [x] **Step 3: Verify transaction tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts transactions.dto.spec.ts
```

Expected: PASS.

## Task 5: Admin AI Task Read Model

**Files:**
- Modify: `apps/api/src/admin/admin.repository.ts`
- Modify: `apps/api/src/admin/admin.service.ts`
- Modify: `apps/api/src/admin/admin.service.spec.ts`
- Modify: `docs/modules/admin/Admin后台接口说明.md`

- [x] **Step 1: Write failing admin service test**

Update `admin.service.spec.ts` so `listAiTasks()` returns real task summaries:

```ts
expect(await service.listAiTasks({ limit: 20, offset: 0 })).toEqual({
  items: [
    {
      id: 'task_1',
      status: 'succeeded',
      type: 'text_parse',
      createdAt: '2026-05-19T11:00:00.000Z',
      updatedAt: '2026-05-19T11:01:00.000Z',
    },
  ],
  limit: 20,
  offset: 0,
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- admin.service.spec.ts
```

Expected before implementation: FAIL because M3 returns an empty stand-in response.

- [x] **Step 2: Implement repository query**

Add a Prisma query against `aiTask.findMany()` with `take`, `skip`, and `orderBy: { createdAt: 'desc' }`. Do not return `inputText`, `errorMessage`, or `rawResult` in admin summaries.

- [x] **Step 3: Verify admin tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- admin.service.spec.ts admin.controller.spec.ts
```

Expected: PASS.

## Task 6: Shared Types And API Client

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify or create: `packages/api-client/test/ai-client.test.mjs`
- Modify: `docs/modules/shared-packages/共享包说明.md`

- [x] **Step 1: Write failing API client tests**

Create or extend `packages/api-client/test/ai-client.test.mjs` to verify:

```js
test('parseAiText posts to NestJS ledger AI endpoint with bearer token');
test('getAiTask reads NestJS task detail endpoint');
test('confirmAiExtraction posts confirmation payload');
test('rejectAiExtraction posts rejection payload');
```

Run:

```bash
pnpm --filter @bookkeeping/api-client test
```

Expected before implementation if tests are new: FAIL until any missing request behavior is added. If existing methods already satisfy tests, PASS and keep the tests as coverage.

- [x] **Step 2: Align shared contracts**

Ensure shared types include:

```ts
export type AiTaskStatus = 'pending' | 'processing' | 'succeeded' | 'failed';
export type AiExtractionStatus = 'pending' | 'confirmed' | 'rejected';
export interface AiCandidateTransaction {
  ledgerId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  occurredAt: string;
  visibility: TransactionVisibility;
  categoryName: string | null;
  accountHint: string | null;
  merchant: string | null;
  note: string | null;
  confidence: number;
  receipt?: AiCandidateReceipt;
}
export interface AiExtractionSummary {
  id: string;
  taskId: string;
  ledgerId: string;
  status: AiExtractionStatus;
  candidate: AiCandidateTransaction;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}
```

Do not add FastAPI URLs or internal service config to shared packages.

- [x] **Step 3: Verify packages**

Run:

```bash
pnpm --filter @bookkeeping/shared-types build
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/api-client build
```

Expected: all commands exit 0.

## Task 7: FastAPI Text Parser After User Scaffolds apps/ai-service

**Files:**
- Existing: `apps/ai-service/AGENTS.md`
- Create after user scaffolding: `apps/ai-service/app/main.py`
- Create after user scaffolding: `apps/ai-service/app/core/config.py`
- Create after user scaffolding: `apps/ai-service/app/api/routes/text_transactions.py`
- Create after user scaffolding: `apps/ai-service/app/schemas/text_transactions.py`
- Create after user scaffolding: `apps/ai-service/app/services/text_transaction_parser.py`
- Create after user scaffolding: `apps/ai-service/tests/test_text_transactions.py`

- [x] **Step 1: User runs FastAPI scaffold command**

User used `uv` to create the FastAPI project. The original pip-based fallback command was:

```bash
mkdir -p apps/ai-service/app
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install fastapi "uvicorn[standard]" pydantic pydantic-settings httpx pytest
python -m pip freeze > requirements.txt
```

Expected: `apps/ai-service/pyproject.toml` and `apps/ai-service/uv.lock` exist and include FastAPI, Uvicorn, Pydantic, httpx, and pytest.

- [x] **Step 2: Verify scaffold result**

Run:

```bash
test -d apps/ai-service
test -f apps/ai-service/pyproject.toml
test -f apps/ai-service/uv.lock
rg -n "fastapi|uvicorn|pydantic|pytest" apps/ai-service/pyproject.toml
```

Expected: all commands exit 0.

- [x] **Step 3: Write failing FastAPI contract tests**

Create `apps/ai-service/tests/test_text_transactions.py` with tests for:

```python
def test_text_transaction_success_returns_candidate():
    response = client.post("/internal/ai/text-transaction", json={
        "taskId": "task_1",
        "ledgerId": "ledger_1",
        "userId": "user_1",
        "inputText": "今天晚饭花了86，微信支付",
        "locale": "zh-CN",
        "timezone": "Asia/Shanghai",
        "defaultCurrency": "CNY",
        "context": {"categoryNames": ["餐饮"], "accountHints": ["微信"]},
    })
    assert response.status_code == 200
    assert response.json()["candidate"]["amount"] == "86.00"

def test_text_transaction_empty_input_returns_422():
    response = client.post("/internal/ai/text-transaction", json={
        "taskId": "task_1",
        "ledgerId": "ledger_1",
        "userId": "user_1",
        "inputText": "",
        "locale": "zh-CN",
        "timezone": "Asia/Shanghai",
        "defaultCurrency": "CNY",
        "context": {"categoryNames": [], "accountHints": []},
    })
    assert response.status_code == 422

def test_text_transaction_unparseable_returns_failed_status():
    response = client.post("/internal/ai/text-transaction", json={
        "taskId": "task_1",
        "ledgerId": "ledger_1",
        "userId": "user_1",
        "inputText": "只是随便记一句",
        "locale": "zh-CN",
        "timezone": "Asia/Shanghai",
        "defaultCurrency": "CNY",
        "context": {"categoryNames": [], "accountHints": []},
    })
    assert response.status_code == 200
    assert response.json()["status"] == "failed"
```

Run:

```bash
cd apps/ai-service
uv run pytest
```

Expected before implementation: FAIL.

- [x] **Step 4: Implement minimal deterministic parser**

Implement a deterministic parser for MVP tests:

- Extract the first decimal or integer amount.
- Treat text containing `收入` or `工资` as `income`; otherwise default to `expense`.
- Use request `defaultCurrency`.
- Use request `timezone` to form an ISO output.
- Match `categoryName` and `accountHint` by substring from provided context.
- Map simple meal-related Chinese keywords such as `晚饭` to `餐饮` when that category exists in context.
- Return low-confidence failed status when no amount exists.

This parser is a local deterministic MVP adapter. Real model provider integration is a later task and must keep the same response contract.

- [x] **Step 5: Verify FastAPI service**

Run:

```bash
cd apps/ai-service
uv run pytest
```

Expected: PASS.

## Task 8: Docs, Context, And Full Verification

**Files:**
- Modify: `.codex/project-context.md`
- Modify: `docs/handover/开发交接说明.md`
- Modify: `docs/modules/api/NestJS服务说明.md`
- Modify: `docs/modules/admin/Admin后台接口说明.md`
- Modify: `docs/modules/ai/AI文本记账说明.md`
- Modify: `docs/modules/shared-packages/共享包说明.md`

- [x] **Step 1: Sync Chinese docs**

Update docs to state:

- M4 AI text accounting creates AI tasks and extractions.
- Confirmation creates `source = ai_text` formal transactions.
- Frontend and api-client still only call NestJS.
- FastAPI remains internal-only and candidate-only.
- `GET /admin/ai/tasks` reads real summaries after `ai_tasks` exists.

- [x] **Step 2: Run final verification**

Run:

```bash
pnpm --filter @bookkeeping/api prisma:generate
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm --filter @bookkeeping/shared-types build
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/api-client build
pnpm build
pnpm test
git diff --check
```

If `apps/ai-service` has been scaffolded, also run:

```bash
cd apps/ai-service
uv run pytest
```

Expected: all commands exit 0.

- [x] **Step 3: Commit M4 implementation**

Run:

```bash
git add .codex/project-context.md apps/api apps/ai-service packages/shared-types packages/api-client docs/modules docs/handover
git commit -m "feat: add m4 ai text accounting"
```

Expected: commit succeeds locally. Do not push unless the user explicitly asks.

## Plan Self-Review

- Spec coverage: The plan covers M4 text parse, `ai_task`, `ai_extraction`, confirm/reject, confirmation-created transactions, Admin AI task summaries, shared types, api-client, FastAPI internal contract, and documentation sync.
- Scope check: Receipt OCR, upload, object storage, mobile UI, and provider production integration are explicitly out of scope.
- Boundary check: Frontend and api-client only call NestJS. FastAPI is internal-only and never creates formal transactions.
- Scaffold check: The plan does not ask an agent to create FastAPI scaffold before user execution; it includes the user-run command required by project protocol.
