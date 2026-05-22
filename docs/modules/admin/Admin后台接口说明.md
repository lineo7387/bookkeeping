# Admin 后台接口说明

## 功能目标

Admin 模块提供平台系统管理员排查问题所需的只读后台接口。当前覆盖用户列表、账本列表、AI 任务摘要列表和审计日志列表，不提供后台写操作；后台 Web 已通过 `@bookkeeping/api-client` 接入这些只读接口。

## 业务规则

- 后台接口只用于平台运营和问题排查，不替代普通用户账本协作接口。
- 当前阶段所有 Admin 接口均为只读接口。
- 用户列表不得返回 `password_hash`、refresh token hash 或其他认证密钥。
- 账本列表只返回账本摘要和成员数量，不返回私密流水、私密账户明细或交易明细。
- AI 任务列表在 M4 起读取真实 `ai_tasks` 摘要，只返回任务 ID、类型、状态和时间，不返回 `input_text`、`error_message`、`raw_result` 或候选详情。
- 审计日志列表用于查看已记录的操作摘要和脱敏后的 metadata，不允许通过 Admin 接口修改或删除审计日志。
- 后台 Web 只能通过 NestJS Admin API 读取这些数据，不得直接访问 FastAPI 或数据库。

## 数据模型

`users` 新增字段：

```txt
is_system_admin Boolean default false
```

该字段表示用户是否拥有平台系统管理员权限。普通账本成员角色仍由 `ledger_members` 管理，二者不互相替代。

Admin 查询复用现有模型：

- `users`
- `ledgers`
- `ledger_members`
- `audit_logs`
- `ai_tasks`

## 接口说明

### GET /admin/users

查询平台用户摘要。

Query:

- `limit`：每页数量，默认 20，范围 1-100。
- `offset`：偏移量，默认 0。

Response data:

```json
{
  "items": [
    {
      "id": "user_1",
      "email": "lineo@example.com",
      "phone": null,
      "nickname": "Lineo",
      "status": "active",
      "isSystemAdmin": true,
      "createdAt": "2026-05-19T00:00:00.000Z",
      "updatedAt": "2026-05-19T00:00:00.000Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### GET /admin/ledgers

查询平台账本摘要。

Query:

- `limit`：每页数量，默认 20，范围 1-100。
- `offset`：偏移量，默认 0。
- `status`：可选，按 AI 任务状态筛选，允许 `pending`、`processing`、`succeeded`、`failed`。
- `type`：可选，按 AI 任务类型筛选，允许 `text_parse`、`receipt_ocr`、`classify`、`insight`。

Response data:

```json
{
  "items": [
    {
      "id": "ledger_1",
      "name": "家庭账本",
      "type": "family",
      "ownerId": "user_1",
      "defaultCurrency": "CNY",
      "timezone": "Asia/Shanghai",
      "memberCount": 2,
      "archivedAt": null,
      "createdAt": "2026-05-19T00:00:00.000Z",
      "updatedAt": "2026-05-19T00:00:00.000Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### GET /admin/ai/tasks

查询 AI 任务摘要。M4 起本接口读取真实 `ai_tasks`，仅返回脱敏摘要用于排查任务队列状态。

Query:

- `limit`：每页数量，默认 20，范围 1-100。
- `offset`：偏移量，默认 0。

Response data:

```json
{
  "items": [
    {
      "id": "task_1",
      "status": "succeeded",
      "type": "text_parse",
      "createdAt": "2026-05-19T11:00:00.000Z",
      "updatedAt": "2026-05-19T11:01:00.000Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### GET /admin/audit-logs

查询审计日志摘要。

Query:

- `limit`：每页数量，默认 20，范围 1-100。
- `offset`：偏移量，默认 0。

Response data:

```json
{
  "items": [
    {
      "id": "audit_1",
      "actorUserId": "user_1",
      "ledgerId": "ledger_1",
      "targetType": "transaction",
      "targetId": "transaction_1",
      "action": "transaction.create",
      "summary": "Created transaction",
      "metadata": {
        "amount": "86.00"
      },
      "createdAt": "2026-05-19T00:00:00.000Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

## 权限规则

- 所有 Admin 接口必须同时通过 `JwtAuthGuard` 和 `SystemAdminGuard`。
- `SystemAdminGuard` 只读取当前 JWT 用户的 `users.is_system_admin` 字段。
- 平台系统管理员权限不授予账本成员权限，也不改变 Ledger Policy 的普通业务判断。
- 普通用户、账本 owner、账本 admin 均不能访问 Admin 接口，除非 `users.is_system_admin` 为 true。

## 异常情况

- 未登录请求由 JWT Guard 拦截。
- 非系统管理员访问返回 `MEMBER_ROLE_DENIED`。
- 查询参数超出范围时由全局 ValidationPipe 拦截。

## 测试与验证方式

```bash
pnpm --filter @bookkeeping/api test -- system-admin.guard.spec.ts
pnpm --filter @bookkeeping/api test -- admin.service.spec.ts admin.controller.spec.ts system-admin.guard.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

修改 Admin API 或 M4 AI 任务摘要后，还需要运行项目级验证命令：

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/api-client build
pnpm --filter @bookkeeping/admin-web build
pnpm build
pnpm test
git diff --check
```

## 后续扩展点

- 后续可为 `/admin/ai/tasks` 增加时间范围、账本 ID 和用户 ID 等排查筛选，但仍不得直接暴露完整输入文本或模型原始结果。
- 后台 Web 认证 UI、搜索、筛选和分页交互应单独补充设计后再扩展；当前首页只展示首屏分页样本。
- 后续如需后台禁用用户、归档账本、重放 AI 任务等写操作，应先补充独立中文设计文档，并为每个敏感操作写入审计日志。
- 可增加按用户、账本、动作和时间范围筛选审计日志的查询参数。
