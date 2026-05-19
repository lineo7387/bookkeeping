# M3 Statistics Admin Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete M3 so users can understand ledger data through statistics and administrators can inspect users, ledgers, AI tasks, and audit records.

**Architecture:** M3 is split into four slices: foundation statistics, audit logs, admin API, and admin-web API integration. NestJS remains the only public business API. Permissions stay in Policy/Guard layers, private data is filtered in backend queries, and admin surfaces are read-oriented until explicit write workflows are designed.

**Tech Stack:** NestJS 11, Prisma 7, Jest, class-validator, Vue 3, TypeScript, Vite, Tailwind CSS, `@bookkeeping/shared-types`, `@bookkeeping/api-client`.

---

## Scope

M3 route scope from project docs:

- 月度收支
- 分类占比
- 账户统计
- 成员消费统计
- 后台用户管理
- 后台账本管理
- 审计日志

Current state:

- 基础统计 API 已在当前工作区完成首版，但尚未提交。
- 后台 Web 仍是静态首页。
- Prisma schema 尚未包含 `audit_logs`。
- 项目尚未定义系统管理员角色；M3 首版后台管理需要先选定最小权限模型。

M3 first-version decision:

- Add platform admin access through `users.is_system_admin Boolean @default(false)`.
- Admin API requires JWT + `SystemAdminGuard`.
- Audit logs are created for sensitive ledger/member/account/category/transaction/admin actions.
- Admin API redacts sensitive fields and never returns password hashes or refresh token hashes.
- Statistics remain ledger-member APIs, not platform-admin APIs.

## File Structure

- Existing statistics slice:
  - `apps/api/src/statistics/*`
  - `docs/modules/statistics/基础统计说明.md`
  - `packages/shared-types/src/index.ts`

- Audit logs slice:
  - Create `docs/modules/audit-logs/审计日志说明.md`
  - Modify `apps/api/prisma/schema.prisma`
  - Create `apps/api/src/audit-logs/audit-logs.module.ts`
  - Create `apps/api/src/audit-logs/audit-logs.service.ts`
  - Create `apps/api/src/audit-logs/audit-logs.repository.ts`
  - Create `apps/api/src/audit-logs/audit-logs.service.spec.ts`
  - Modify services that perform sensitive operations after audit service exists

- Admin API slice:
  - Create `docs/modules/admin/Admin后台接口说明.md`
  - Create `apps/api/src/admin/dto/list-admin-users-query.dto.ts`
  - Create `apps/api/src/admin/dto/list-admin-ledgers-query.dto.ts`
  - Create `apps/api/src/admin/dto/list-admin-audit-logs-query.dto.ts`
  - Create `apps/api/src/admin/admin.module.ts`
  - Create `apps/api/src/admin/admin.controller.ts`
  - Create `apps/api/src/admin/admin.service.ts`
  - Create `apps/api/src/admin/admin.repository.ts`
  - Create `apps/api/src/admin/system-admin.guard.ts`
  - Create `apps/api/src/admin/*.spec.ts`
  - Modify `apps/api/src/app.module.ts`
  - Modify `packages/shared-types/src/index.ts`

- Admin Web API integration:
  - Read `apps/admin-web/AGENTS.md` and `docs/modules/admin-web/后台Web说明.md` before implementation.
  - Modify `packages/api-client/src/index.ts`
  - Modify relevant `apps/admin-web/src/*` files after checking current structure.
  - Keep frontend API calls NestJS-only.

## Task 1: Finalize Existing Statistics Slice

**Files:**
- Existing: `apps/api/src/statistics/statistics.controller.ts`
- Existing: `apps/api/src/statistics/statistics.service.ts`
- Existing: `apps/api/src/statistics/statistics.repository.ts`
- Existing: `apps/api/src/statistics/*.spec.ts`
- Existing: `docs/modules/statistics/基础统计说明.md`
- Existing: `packages/shared-types/src/index.ts`
- Existing: `.codex/project-context.md`
- Existing: `docs/handover/开发交接说明.md`

- [ ] **Step 1: Verify current statistics tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- statistics.service.spec.ts statistics.controller.spec.ts statistics.dto.spec.ts statistics.repository.spec.ts
```

Expected: `4 passed`, `13 passed`.

- [ ] **Step 2: Verify API package and workspace**

Run:

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm build
pnpm test
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit statistics slice**

Run:

```bash
git add .codex/project-context.md apps/api/AGENTS.md apps/api/src/app.module.ts apps/api/src/statistics docs/modules/statistics docs/modules/api docs/modules/shared-packages docs/handover packages/shared-types/src/index.ts
git commit -m "feat: add m3 foundation statistics api"
```

Expected: commit succeeds locally. Do not push.

## Task 2: Audit Log Data Model And Module Document

**Files:**
- Create `docs/modules/audit-logs/审计日志说明.md`
- Modify `apps/api/prisma/schema.prisma`
- Modify `docs/handover/开发交接说明.md`

- [x] **Step 1: Write the Chinese module document**

Create `docs/modules/audit-logs/审计日志说明.md` with:

```markdown
# 审计日志说明

## 功能目标

审计日志模块记录敏感业务操作，帮助后台管理员排查问题，并为后续安全审计提供基础数据。

## 业务规则

- 审计日志只记录操作摘要，不记录密码、refresh token、票据图片原文或完整 AI prompt。
- 重要操作成功后写入审计日志；失败请求第一版暂不记录，后续可由异常过滤器统一扩展。
- 金额字段如进入 metadata，必须保持 Decimal 字符串。
- 审计日志不可通过普通业务接口修改或删除。

## 数据模型

audit_logs:

id
actor_user_id
ledger_id
target_type
target_id
action
summary
metadata
created_at

## 权限规则

- 写入由业务 Service 触发，不暴露普通用户写入接口。
- 查询只允许系统管理员通过 Admin API 访问。

## 测试与验证方式

pnpm --filter @bookkeeping/api test -- audit-logs.service.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

- [x] **Step 2: Add failing Prisma/schema-oriented test**

Create `apps/api/src/audit-logs/audit-logs.service.spec.ts`:

```ts
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  it('records a sanitized audit event', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({
        id: 'audit_1',
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'transaction',
        targetId: 'transaction_1',
        action: 'transaction.create',
        summary: 'Created transaction',
        metadata: { amount: '86.00' },
        createdAt: '2026-05-19T00:00:00.000Z',
      }),
    };
    const service = new AuditLogsService(repository as unknown as AuditLogsRepository);

    await expect(
      service.record({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'transaction',
        targetId: 'transaction_1',
        action: 'transaction.create',
        summary: 'Created transaction',
        metadata: { amount: '86.00', password: 'secret' },
      }),
    ).resolves.toMatchObject({
      id: 'audit_1',
      metadata: { amount: '86.00' },
    });
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- audit-logs.service.spec.ts
```

Expected before implementation: FAIL because `AuditLogsService` does not exist.

- [x] **Step 3: Add Prisma model**

Modify `apps/api/prisma/schema.prisma`:

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  actorUserId String?  @map("actor_user_id")
  ledgerId    String?  @map("ledger_id")
  targetType  String   @map("target_type")
  targetId    String?  @map("target_id")
  action      String
  summary     String
  metadata    Json?    @db.JsonB
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([actorUserId])
  @@index([ledgerId])
  @@index([targetType, targetId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

Run:

```bash
pnpm --filter @bookkeeping/api prisma:generate
```

Expected: Prisma client regenerates successfully.

## Task 3: Audit Log Repository And Service

**Files:**
- Create `apps/api/src/audit-logs/audit-logs.repository.ts`
- Create `apps/api/src/audit-logs/audit-logs.service.ts`
- Create `apps/api/src/audit-logs/audit-logs.module.ts`
- Modify `apps/api/src/app.module.ts`
- Test `apps/api/src/audit-logs/audit-logs.service.spec.ts`

- [x] **Step 1: Implement repository**

Create `apps/api/src/audit-logs/audit-logs.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogCreateData {
  actorUserId?: string | null;
  ledgerId?: string | null;
  targetType: string;
  targetId?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AuditLogCreateData) {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId ?? null,
        ledgerId: data.ledgerId ?? null,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        action: data.action,
        summary: data.summary,
        metadata: data.metadata ?? null,
      },
    });

    return {
      id: auditLog.id,
      actorUserId: auditLog.actorUserId,
      ledgerId: auditLog.ledgerId,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      action: auditLog.action,
      summary: auditLog.summary,
      metadata: auditLog.metadata as Record<string, unknown> | null,
      createdAt: auditLog.createdAt.toISOString(),
    };
  }
}
```

- [x] **Step 2: Implement service sanitization**

Create `apps/api/src/audit-logs/audit-logs.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { AuditLogsRepository, type AuditLogCreateData } from './audit-logs.repository';

const SENSITIVE_METADATA_KEYS = new Set(['password', 'passwordHash', 'refreshToken', 'refreshTokenHash', 'token']);

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async record(data: AuditLogCreateData) {
    return this.auditLogsRepository.create({
      ...data,
      metadata: sanitizeMetadata(data.metadata),
    });
  }
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !SENSITIVE_METADATA_KEYS.has(key)));
}
```

- [x] **Step 3: Create module and import it**

Create `apps/api/src/audit-logs/audit-logs.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogsService } from './audit-logs.service';

@Module({
  providers: [AuditLogsRepository, AuditLogsService],
  exports: [AuditLogsService, AuditLogsRepository],
})
export class AuditLogsModule {}
```

Modify `apps/api/src/app.module.ts` and add `AuditLogsModule` to imports.

- [x] **Step 4: Verify GREEN**

Run:

```bash
pnpm --filter @bookkeeping/api test -- audit-logs.service.spec.ts
pnpm --filter @bookkeeping/api typecheck
```

Expected: commands exit 0.

Completion note on 2026-05-19: audit log foundation completed with Prisma 7 nullable JSON handling through `Prisma.JsonNull`; narrow service test and API typecheck passed before final package/workspace verification.

## Task 4: System Admin Guard And Shared Types

**Files:**
- Modify `apps/api/prisma/schema.prisma`
- Modify `apps/api/src/users/users.repository.ts`
- Create `apps/api/src/admin/system-admin.guard.ts`
- Create `apps/api/src/admin/system-admin.guard.spec.ts`
- Modify `packages/shared-types/src/index.ts`

- [ ] **Step 1: Write failing guard test**

Create `apps/api/src/admin/system-admin.guard.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { SystemAdminGuard } from './system-admin.guard';

describe('SystemAdminGuard', () => {
  it('allows system admin users', async () => {
    const usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user_1', isSystemAdmin: true }),
    };
    const guard = new SystemAdminGuard(usersRepository as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user_1' } }) }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it('rejects non-admin users', async () => {
    const usersRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'user_1', isSystemAdmin: false }),
    };
    const guard = new SystemAdminGuard(usersRepository as never);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'user_1' } }) }),
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- system-admin.guard.spec.ts
```

Expected before implementation: FAIL because guard does not exist.

- [ ] **Step 2: Add user admin flag**

Modify `apps/api/prisma/schema.prisma`:

```prisma
model User {
  ...
  isSystemAdmin Boolean @default(false) @map("is_system_admin")
  ...
}
```

Run:

```bash
pnpm --filter @bookkeeping/api prisma:generate
```

Expected: Prisma client regenerates successfully.

- [ ] **Step 3: Implement guard**

Create `apps/api/src/admin/system-admin.guard.ts`:

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { fail } from '../common/api-response';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly usersRepository: UsersRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = request.user?.id;
    if (!userId) {
      throw adminDenied();
    }

    const user = await this.usersRepository.findById(userId);
    if (!user?.isSystemAdmin) {
      throw adminDenied();
    }

    return true;
  }
}

function adminDenied(): ForbiddenException {
  return new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'System admin role required'));
}
```

- [ ] **Step 4: Verify guard**

Run:

```bash
pnpm --filter @bookkeeping/api test -- system-admin.guard.spec.ts
pnpm --filter @bookkeeping/api typecheck
```

Expected: commands exit 0.

## Task 5: Admin API Read Models

**Files:**
- Create `docs/modules/admin/Admin后台接口说明.md`
- Create `apps/api/src/admin/admin.repository.ts`
- Create `apps/api/src/admin/admin.service.ts`
- Create `apps/api/src/admin/admin.controller.ts`
- Create `apps/api/src/admin/admin.module.ts`
- Create `apps/api/src/admin/admin.service.spec.ts`
- Create `apps/api/src/admin/admin.controller.spec.ts`
- Modify `apps/api/src/app.module.ts`
- Modify `packages/shared-types/src/index.ts`

- [ ] **Step 1: Write Admin API document**

Create `docs/modules/admin/Admin后台接口说明.md` with endpoint list:

```markdown
# Admin 后台接口说明

## 功能目标

Admin 模块提供平台管理员排查问题所需的只读后台接口，第一版覆盖用户列表、账本列表、AI 任务占位列表和审计日志列表。

## 接口说明

- GET /admin/users
- GET /admin/ledgers
- GET /admin/ai/tasks
- GET /admin/audit-logs

## 权限规则

- 所有接口必须通过 JwtAuthGuard 和 SystemAdminGuard。
- 返回结果不得包含 password_hash、refresh_token_hash 或私密流水明细。
```

- [ ] **Step 2: Write failing service test**

Create `apps/api/src/admin/admin.service.spec.ts`:

```ts
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('returns redacted users', async () => {
    const repository = {
      listUsers: jest.fn().mockResolvedValue([
        {
          id: 'user_1',
          email: 'lineo@example.com',
          phone: null,
          nickname: 'Lineo',
          status: 'active',
          isSystemAdmin: true,
          createdAt: '2026-05-19T00:00:00.000Z',
          updatedAt: '2026-05-19T00:00:00.000Z',
        },
      ]),
    };
    const service = new AdminService(repository as unknown as AdminRepository);

    await expect(service.listUsers({ limit: 20, offset: 0 })).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'user_1',
          email: 'lineo@example.com',
          isSystemAdmin: true,
        }),
      ],
    });
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- admin.service.spec.ts
```

Expected before implementation: FAIL because admin service does not exist.

- [ ] **Step 3: Implement admin read repository**

Implement repository methods:

```ts
listUsers(query): Promise<{ items: AdminUserSummary[] }>
listLedgers(query): Promise<{ items: AdminLedgerSummary[] }>
listAuditLogs(query): Promise<{ items: AdminAuditLogSummary[] }>
listAiTasks(query): Promise<{ items: [] }>
```

First AI tasks endpoint may return an empty list until M4 creates AI task models, but it must be documented as an M3 admin placeholder.

- [ ] **Step 4: Implement controller**

Routes:

```txt
GET /admin/users
GET /admin/ledgers
GET /admin/ai/tasks
GET /admin/audit-logs
```

Controller class uses:

```ts
@Controller('admin')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
```

- [ ] **Step 5: Verify admin API**

Run:

```bash
pnpm --filter @bookkeeping/api test -- admin.service.spec.ts admin.controller.spec.ts system-admin.guard.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

Expected: commands exit 0.

## Task 6: Add Audit Writes To Sensitive Operations

**Files:**
- Modify `apps/api/src/ledgers/ledgers.module.ts`
- Modify `apps/api/src/ledgers/ledgers.service.ts`
- Modify `apps/api/src/accounts/accounts.module.ts`
- Modify `apps/api/src/accounts/accounts.service.ts`
- Modify `apps/api/src/categories/categories.module.ts`
- Modify `apps/api/src/categories/categories.service.ts`
- Modify `apps/api/src/transactions/transactions.module.ts`
- Modify `apps/api/src/transactions/transactions.service.ts`
- Modify corresponding `*.service.spec.ts`

- [ ] **Step 1: Write failing transaction audit test**

Add to `apps/api/src/transactions/transactions.service.spec.ts`:

```ts
it('records an audit log after creating a transaction', async () => {
  const auditLogsService = { record: jest.fn().mockResolvedValue({ id: 'audit_1' }) };
  service = new TransactionsService(
    repository as unknown as TransactionsRepository,
    policy as unknown as LedgerPolicyService,
    auditLogsService as never,
  );
  policy.canCreateTransaction.mockResolvedValue(true);
  policy.canViewAccount.mockResolvedValue(true);
  repository.findActiveAccountById.mockResolvedValue(account);
  repository.findActiveCategoryById.mockResolvedValue(category);
  repository.createWithBalanceChanges.mockResolvedValue(transaction);

  await service.createTransaction('user_1', 'ledger_1', {
    type: 'expense',
    amount: '86.00',
    occurredAt: '2026-05-18T10:00:00.000Z',
    accountId: 'account_1',
    categoryId: 'category_1',
  });

  expect(auditLogsService.record).toHaveBeenCalledWith(expect.objectContaining({
    actorUserId: 'user_1',
    ledgerId: 'ledger_1',
    targetType: 'transaction',
    action: 'transaction.create',
  }));
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts
```

Expected before implementation: FAIL because constructor does not accept `AuditLogsService`.

- [ ] **Step 2: Inject AuditLogsModule into business modules**

Add `AuditLogsModule` imports to ledgers/accounts/categories/transactions modules.

- [ ] **Step 3: Record audit events after successful operations**

Add audit calls after successful create/update/delete/archive/member-role operations.

Required actions:

```txt
ledger.create
ledger.update
ledger.archive
member.role.update
member.remove
account.create
account.update
account.archive
category.create
category.update
category.archive
transaction.create
transaction.update
transaction.delete
```

- [ ] **Step 4: Verify all affected service tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ledgers.service.spec.ts accounts.service.spec.ts categories.service.spec.ts transactions.service.spec.ts audit-logs.service.spec.ts
pnpm --filter @bookkeeping/api typecheck
```

Expected: commands exit 0.

## Task 7: Admin Web Connects To Real Admin API

**Files:**
- Read first: `apps/admin-web/AGENTS.md`
- Read first: `docs/modules/admin-web/后台Web说明.md`
- Modify `packages/api-client/src/index.ts`
- Modify relevant `apps/admin-web/src/*` files after inspecting actual structure
- Modify `docs/modules/admin-web/后台Web说明.md`

- [ ] **Step 1: Inspect admin-web structure**

Run:

```bash
rg --files apps/admin-web/src packages/api-client/src | sort
```

Expected: see actual Vue components and API client entrypoints.

- [ ] **Step 2: Add API client methods**

Add methods to `BookkeepingApiClient`:

```ts
listAdminUsers(query?: { limit?: number; offset?: number })
listAdminLedgers(query?: { limit?: number; offset?: number })
listAdminAuditLogs(query?: { limit?: number; offset?: number })
listAdminAiTasks(query?: { limit?: number; offset?: number })
```

Run:

```bash
pnpm --filter @bookkeeping/api-client typecheck
pnpm --filter @bookkeeping/api-client build
```

Expected: commands exit 0.

- [ ] **Step 3: Replace static admin dashboard data**

Use Vue 3 Composition API. The page should:

- load summary data from NestJS admin endpoints
- show loading and error states
- never call FastAPI
- keep current `designer.md` visual direction

- [ ] **Step 4: Verify frontend**

Run:

```bash
pnpm --filter @bookkeeping/admin-web typecheck
pnpm --filter @bookkeeping/admin-web build
pnpm build
```

Expected: commands exit 0.

## Task 8: Final M3 Documentation And Handoff

**Files:**
- Modify `.codex/project-context.md`
- Modify `AGENTS.md`
- Modify `apps/api/AGENTS.md`
- Modify `apps/admin-web/AGENTS.md` if admin-web rules need updated status
- Modify `docs/handover/开发交接说明.md`
- Modify `docs/modules/api/NestJS服务说明.md`
- Modify `docs/modules/shared-packages/共享包说明.md`

- [ ] **Step 1: Update current state docs**

Document:

- M3 statistics API completed
- M3 audit logs completed
- M3 admin API completed
- admin-web connected to real NestJS API if Task 7 is completed
- AI remains M4 and must not be implemented in M3 except admin placeholder listing

- [ ] **Step 2: Run final verification**

Run:

```bash
pnpm --filter @bookkeeping/shared-types build
pnpm --filter @bookkeeping/api prisma:generate
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm --filter @bookkeeping/api-client build
pnpm --filter @bookkeeping/admin-web build
pnpm build
pnpm test
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit M3 completion**

Run:

```bash
git add .
git commit -m "feat: complete m3 admin and audit foundation"
```

Expected: commit succeeds locally. Do not push.

## Self-Review

- Spec coverage: M3 route items are covered. Statistics is Task 1; admin users/ledgers/AI tasks/audit logs are Tasks 4-7; audit log data and writes are Tasks 2, 3, and 6.
- Placeholder scan: No `TBD`/`TODO` placeholders are included. The AI tasks endpoint is explicitly defined as an empty M3 admin placeholder until M4 creates AI task models.
- Type consistency: Plan uses `isSystemAdmin`, `AuditLogsService`, `AuditLogsRepository`, `SystemAdminGuard`, and admin summary names consistently.
- Scope check: M3 is large but sequential. The recommended execution is to finish and commit current statistics first, then implement audit logs, then admin API, then admin-web integration.
