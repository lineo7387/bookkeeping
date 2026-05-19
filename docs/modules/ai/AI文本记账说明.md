# AI 文本记账说明

## 功能目标

AI 文本记账用于把用户输入的自然语言转换为候选流水，例如“今天晚饭花了 86，微信支付”。M4 第一版只完成文本解析、候选结果保存、候选确认和拒绝闭环，不提前实现票据 OCR、移动端页面或后台 AI 写操作。

AI 文本记账只提高录入效率，不替代用户确认。FastAPI 只生成候选结果；NestJS 负责认证、账本权限、任务状态、候选落库和用户确认后的正式流水创建。

当前实现状态：M4 已完成 NestJS 闭环首版和 FastAPI 确定性 MVP parser。NestJS 已包含 `AiModule`、Prisma `ai_tasks` / `ai_extractions` 模型、内部 FastAPI client、候选保存、候选确认/拒绝，以及确认后创建 `source = ai_text` 正式流水并联动账户余额。后台 `GET /admin/ai/tasks` 已从占位空列表升级为真实只读摘要查询。

## 范围

M4 包含：

- `POST /ledgers/:ledgerId/ai/text-parse`：创建文本解析任务，调用内部 FastAPI，保存候选结果。
- `GET /ledgers/:ledgerId/ai/tasks`：查询当前用户在账本内可见的 AI 任务列表。
- `GET /ai/tasks/:taskId`：查询单个 AI 任务和候选结果。
- `POST /ai/extractions/:extractionId/confirm`：用户确认候选结果，NestJS 创建正式流水。
- `POST /ai/extractions/:extractionId/reject`：用户拒绝候选结果，保留拒绝状态。
- 后台 `GET /admin/ai/tasks` 从 M3 占位列表升级为真实只读列表。

M4 不包含：

- 票据 OCR、图片上传和对象存储。
- 移动端或后台 Web 的完整 AI 交互页面。
- AI 自动创建正式流水。
- FastAPI 直接访问主业务数据库。
- 前端直接调用 FastAPI。

## 服务边界

### NestJS

NestJS 是唯一对外业务 API，负责：

- 校验 JWT 登录态。
- 通过 Ledger Policy 校验账本成员身份和记账权限。
- 创建和更新 `ai_tasks`。
- 读取账本 timezone、默认币种、分类名称和账户名称作为最小上下文。
- 调用内部 FastAPI `POST /internal/ai/text-transaction`。
- 保存 `ai_extractions.raw_result`、`suggested_transaction`、`confidence` 和候选状态。
- 用户确认后复用流水 Service 创建 `source = ai_text` 的正式 `transaction`，并联动账户余额。
- 写入必要审计日志，但不记录完整输入文本、完整模型原文、token 或服务间密钥。

### FastAPI

FastAPI 是 internal-only 服务，负责：

- 根据 NestJS 传入的最小上下文解析自然语言文本。
- 返回结构化候选结果、置信度和脱敏后的原始结果摘要。
- 在不确定时返回低置信度或失败错误，不编造字段。

FastAPI 不负责：

- 用户认证和账本成员权限。
- 创建、确认、修改或删除正式流水。
- 直接访问 PostgreSQL 主业务表。
- 对前端、后台 Web、移动端开放接口。

## 数据模型

`ai_tasks`

```txt
id
ledger_id
user_id
type                 text_parse | receipt_ocr | classify | insight
status               pending | processing | succeeded | failed
input_text
input_file_url
error_message
created_at
updated_at
```

`ai_extractions`

```txt
id
ai_task_id
ledger_id
user_id
raw_result
suggested_transaction
confidence
status               pending | confirmed | rejected
created_at
updated_at
```

M4 文本记账只使用 `type = text_parse`，`input_file_url` 为后续 OCR 预留。`raw_result` 和 `input_text` 均按敏感数据处理，普通用户界面只展示候选摘要，不展示模型原始结果。

建议索引：

```txt
ai_tasks(ledger_id, status)
ai_tasks(user_id, created_at)
ai_extractions(ai_task_id)
ai_extractions(ledger_id, status)
ai_extractions(user_id, status)
```

## 标准流程

```txt
前端提交自然语言文本
  -> NestJS POST /ledgers/:ledgerId/ai/text-parse
  -> JwtAuthGuard 校验登录态
  -> LedgerPolicyService 校验 canCreateTransaction
  -> NestJS 创建 ai_task: processing
  -> NestJS 读取账本、分类、账户最小上下文
  -> NestJS 调用 FastAPI /internal/ai/text-transaction
  -> NestJS 保存 ai_extraction: pending
  -> NestJS 标记 ai_task: succeeded
  -> 前端展示候选结果
  -> 用户确认或拒绝
  -> 确认时 NestJS 创建正式 transaction(source = ai_text)
```

如果 FastAPI 调用失败，NestJS 必须把 `ai_tasks.status` 标记为 `failed`，保存可展示的 `error_message`，并返回统一 `AI_TASK_FAILED` 错误。

## 接口说明

### 创建文本解析任务

`POST /ledgers/:ledgerId/ai/text-parse`

请求体：

```json
{
  "inputText": "今天晚饭花了86，微信支付",
  "locale": "zh-CN",
  "timezone": "Asia/Shanghai",
  "defaultCurrency": "CNY"
}
```

响应体：

```json
{
  "success": true,
  "data": {
    "taskId": "ai_task_id",
    "ledgerId": "ledger_id",
    "status": "succeeded",
    "extraction": {
      "id": "ai_extraction_id",
      "taskId": "ai_task_id",
      "ledgerId": "ledger_id",
      "status": "pending",
      "candidate": {
        "ledgerId": "ledger_id",
        "type": "expense",
        "amount": "86.00",
        "currency": "CNY",
        "occurredAt": "2026-05-19T11:00:00.000Z",
        "visibility": "ledger",
        "categoryName": "餐饮",
        "accountHint": "微信",
        "merchant": null,
        "note": "晚饭",
        "confidence": 0.91
      },
      "confidence": 0.91,
      "createdAt": "2026-05-19T11:00:00.000Z",
      "updatedAt": "2026-05-19T11:00:00.000Z"
    }
  }
}
```

### 查询账本 AI 任务

`GET /ledgers/:ledgerId/ai/tasks`

当前用户必须是账本 active 成员。普通账本成员只能查看自己创建的 AI 任务；后续如需 owner/admin 查看全账本 AI 任务，应先补充隐私规则和审计要求。

### 查询单个 AI 任务

`GET /ai/tasks/:taskId`

当前用户必须是任务创建者，或后续明确授权的账本管理员。M4 第一版按任务创建者可见实现，避免泄露其他成员输入文本。

### 确认候选结果

`POST /ai/extractions/:extractionId/confirm`

请求体允许用户覆盖候选字段：

```json
{
  "ledgerId": "ledger_id",
  "accountId": "account_id",
  "categoryId": "category_id",
  "amount": "86.00",
  "occurredAt": "2026-05-19T11:00:00.000Z",
  "visibility": "ledger",
  "note": "晚饭"
}
```

确认规则：

- 只有 `pending` 候选可以确认。
- 确认人必须是候选创建者，并且仍具备 `canCreateTransaction` 权限。
- `accountId` 必须属于同一账本并对确认人可见。
- `categoryId` 必须属于同一账本，且类型与候选流水类型匹配。
- 私密账户确认出的正式流水必须强制 `visibility = private`。
- 正式流水 `source` 必须由 NestJS 设置为 `ai_text`，前端不能指定。
- 创建正式流水和更新候选状态必须在同一个事务内完成。
- 确认创建的正式流水会在 `metadata.aiExtractionId` 保存来源候选 ID，便于后续排查和反馈闭环。

### 拒绝候选结果

`POST /ai/extractions/:extractionId/reject`

请求体：

```json
{
  "reason": "金额不准确"
}
```

拒绝后状态为 `rejected`，不创建正式流水，不删除任务和候选记录。

## 权限规则

- 文本解析入口要求登录用户是账本 active 成员，并且具备创建流水能力。
- AI 任务和候选结果默认仅创建者可见，避免家庭账本成员互相看到原始输入文本。
- 用户确认候选时重新校验账本权限、账户可见性、分类归属和流水创建权限。
- 系统管理员只能通过 Admin API 查看脱敏后的 AI 任务摘要；若后续需要查看原始结果，必须新增独立设计和审计日志。

## 异常情况

- 输入文本为空或过长：`VALIDATION_FAILED`。
- 账本不存在或已归档：`LEDGER_NOT_FOUND`。
- 非账本成员访问：`LEDGER_ACCESS_DENIED`。
- 角色能力不足：`MEMBER_ROLE_DENIED`。
- FastAPI 超时、不可用或解析失败：`AI_TASK_FAILED`。
- 候选不存在、非创建者访问、已确认或已拒绝：使用 not found 风格响应，避免泄露资源存在性。
- 确认时账户或分类不可用：复用账户、分类和流水模块已有校验错误。

## 隐私和日志

- NestJS 发送给 FastAPI 的上下文只包含当前账本必要的分类名称、账户名称、timezone 和默认币种，不发送全量流水和成员列表。
- 日志不得输出完整 `inputText`、完整 `raw_result`、手机号、邮箱、token、API Key 或服务间密钥。
- `raw_result` 默认不通过普通用户接口返回。
- 后台 AI 任务列表只展示任务摘要，不展示完整输入文本和完整模型原文。
- 拒绝候选必须保留状态，不能物理删除审计线索。

## 测试与验证方式

```bash
pnpm --filter @bookkeeping/api test -- ai.service.spec.ts ai.controller.spec.ts ai.repository.spec.ts ai.dto.spec.ts
pnpm --filter @bookkeeping/api test -- transactions.service.spec.ts transactions.dto.spec.ts admin.service.spec.ts admin.controller.spec.ts
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/shared-types build
pnpm build
pnpm test
git diff --check
```

FastAPI 脚手架创建后补充：

```bash
cd apps/ai-service
source .venv/bin/activate
pytest
```

## 后续扩展点

- 票据 OCR、图片上传、对象存储和异步任务。
- 移动端 AI 文本记账输入与候选确认页面。
- 低置信度候选的字段补全提示。
- 商户别名、分类偏好和账户匹配规则。
- AI 任务重试、超时熔断、供应商成本统计和模型切换。
- 用户确认、修改和拒绝行为的反馈闭环。
