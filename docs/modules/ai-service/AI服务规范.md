# AI 服务规范

## 功能目标

AI 服务用于支持个人和家庭账本中的智能记账能力，第一阶段聚焦两个可落地场景：

- 文本记账解析：把用户输入的自然语言转换为候选流水，例如“今天晚饭花了 86，微信支付”。
- 票据 OCR：从票据图片中识别金额、时间、商户、支付方式和明细，生成候选结果。

AI 服务只提高录入效率，不替代用户做最终业务决策。所有候选结果必须先由 NestJS 保存为 `ai_extractions`，再由用户确认后才能创建正式 `transaction`。

## 当前工程状态

- `apps/ai-service` 已由用户使用 `uv` 创建 FastAPI 最小项目。
- 当前已实现 M4 文本记账内部契约 `POST /internal/ai/text-transaction` 的确定性 MVP parser，用于端到端打通 NestJS AI 编排前的内部服务契约。
- 当前 parser 只做规则解析：提取首个金额、根据关键词判断收入/支出、匹配分类和账户提示、返回候选结果或失败状态。真实模型供应商、提示词工程、熔断和成本统计属于后续扩展。
- 验证命令为 `cd apps/ai-service && uv run pytest`。

## 服务边界

### NestJS 主业务服务

NestJS 是唯一对外业务 API，负责：

- 对前端提供 `POST /ledgers/:ledgerId/ai/text-parse`、`POST /ledgers/:ledgerId/ai/receipt-ocr`、`GET /ledgers/:ledgerId/ai/tasks`、`GET /ai/tasks/:taskId`、`POST /ai/extractions/:extractionId/confirm`、`POST /ai/extractions/:extractionId/reject` 等接口。
- 校验登录态、账本成员身份和 `ledger_members` 权限。
- 创建和更新 `ai_tasks`。
- 调用内部 FastAPI 服务并处理超时、重试和错误映射。
- 保存 `raw_result`、`suggested_transaction`、`confidence` 和候选状态。
- 在用户确认候选结果后创建正式 `transaction`，并确保所有交易都归属于 `ledger`。
- 写入必要的审计日志，但不记录敏感原文和完整票据 URL。

### FastAPI AI 服务

FastAPI 是内部服务，只能被 NestJS 或受控后台任务调用，不能暴露给前端直接访问。FastAPI 负责：

- 执行文本解析、票据 OCR、分类建议等 AI 能力。
- 返回结构化候选结果和置信度。
- 在不确定时返回 `null` 或低置信度，而不是编造字段。
- 返回便于 NestJS 落库的原始结果片段，由 NestJS 存入 `raw_result`。

FastAPI 不负责：

- 用户认证、账本权限和成员权限。
- 创建、确认、修改或删除正式流水。
- 直接访问前端会话、用户 token 或主业务数据库。
- 决定私密流水、私密账户和成员可见性。

## 标准流程

### 文本记账

```txt
用户输入文本
  -> 前端调用 NestJS: POST /ledgers/:ledgerId/ai/text-parse
  -> NestJS 校验 ledger 权限和记账能力
  -> NestJS 创建 ai_task
  -> NestJS 调用 FastAPI 内部接口
  -> FastAPI 返回候选结果
  -> NestJS 保存 ai_extraction(raw_result, suggested_transaction, confidence)
  -> 前端展示候选结果
  -> 用户确认或拒绝
  -> 用户确认后 NestJS 创建 transaction
```

### 票据 OCR

```txt
用户上传票据图片
  -> 前端调用 NestJS 上传或 OCR 入口
  -> NestJS 校验 ledger 权限
  -> NestJS 保存图片到受控对象存储
  -> NestJS 创建 ai_task
  -> NestJS 通过 BullMQ 或内部 worker 调用 FastAPI
  -> FastAPI 返回票据 OCR 候选结果
  -> NestJS 保存 ai_extraction(raw_result, suggested_transaction, confidence)
  -> 前端轮询或接收任务结果
  -> 用户确认或拒绝
  -> 用户确认后 NestJS 创建 transaction
```

## NestJS-to-FastAPI 内部 API Contract

内部接口只在服务网络内开放，并使用本节约定的固定路径作为稳定契约。若确需调整路径或字段，必须同步更新本文档、`docs/architecture/AI服务设计.md` 和 NestJS 调用方配置，不能只在 FastAPI 路由中单边变更。

### 通用请求头

```txt
X-Internal-Service: bookkeeping-api
X-Request-Id: <request id>
Content-Type: application/json
```

`X-Request-Id` 用于跨 NestJS、FastAPI、队列 worker 串联日志。内部鉴权方式可以使用服务间 token 或网关策略，密钥不得写入日志。

### 文本解析

`POST /internal/ai/text-transaction`

请求体：

```json
{
  "taskId": "ai_task_id",
  "ledgerId": "ledger_id",
  "userId": "user_id",
  "inputText": "今天晚饭花了86，微信支付",
  "locale": "zh-CN",
  "timezone": "Asia/Shanghai",
  "defaultCurrency": "CNY",
  "context": {
    "categoryNames": ["餐饮", "交通", "购物"],
    "accountHints": ["现金", "微信", "支付宝"]
  }
}
```

响应体：

```json
{
  "taskId": "ai_task_id",
  "status": "succeeded",
  "candidate": {
    "type": "expense",
    "amount": "86.00",
    "currency": "CNY",
    "occurredAt": "2026-05-17T12:00:00.000Z",
    "categoryName": "餐饮",
    "accountHint": "微信",
    "merchant": null,
    "note": "晚饭",
    "confidence": 0.91
  },
  "rawResult": {
    "provider": "model-provider",
    "model": "model-name",
    "reason": "parsed from user text"
  }
}
```

### 票据 OCR

`POST /internal/ai/receipt-ocr`

请求体：

```json
{
  "taskId": "ai_task_id",
  "ledgerId": "ledger_id",
  "userId": "user_id",
  "file": {
    "storageKey": "receipts/2026/05/example.jpg",
    "signedUrl": "https://object-storage.example/signed-url",
    "mimeType": "image/jpeg"
  },
  "locale": "zh-CN",
  "timezone": "Asia/Shanghai",
  "defaultCurrency": "CNY",
  "context": {
    "categoryNames": ["餐饮", "交通", "购物"],
    "accountHints": ["现金", "微信", "支付宝"]
  }
}
```

响应体：

```json
{
  "taskId": "ai_task_id",
  "status": "succeeded",
  "candidate": {
    "type": "expense",
    "amount": "128.50",
    "currency": "CNY",
    "occurredAt": "2026-05-17T19:30:00.000Z",
    "categoryName": "餐饮",
    "accountHint": null,
    "merchant": "示例餐厅",
    "note": "票据识别候选",
    "confidence": 0.86,
    "receipt": {
      "invoiceNo": null,
      "taxNo": null,
      "items": [
        {
          "name": "套餐",
          "quantity": "1",
          "unitPrice": "128.50",
          "amount": "128.50"
        }
      ]
    }
  },
  "rawResult": {
    "provider": "ocr-provider",
    "model": "ocr-model",
    "textBlocks": ["示例餐厅", "合计 128.50"]
  }
}
```

## Candidate Result Schema

### Text Parse Candidate

```json
{
  "type": "expense",
  "amount": "86.00",
  "currency": "CNY",
  "occurredAt": "2026-05-17T12:00:00.000Z",
  "categoryName": "餐饮",
  "accountHint": "微信",
  "merchant": null,
  "note": "晚饭",
  "confidence": 0.91
}
```

### Receipt OCR Candidate

```json
{
  "type": "expense",
  "amount": "128.50",
  "currency": "CNY",
  "occurredAt": "2026-05-17T19:30:00.000Z",
  "categoryName": "餐饮",
  "accountHint": null,
  "merchant": "示例餐厅",
  "note": "票据识别候选",
  "confidence": 0.86,
  "receipt": {
    "invoiceNo": null,
    "taxNo": null,
    "items": [
      {
        "name": "套餐",
        "quantity": "1",
        "unitPrice": "128.50",
        "amount": "128.50"
      }
    ]
  }
}
```

### 字段规则

- `type` 只允许 `expense`、`income`、`transfer`，第一阶段文本和 OCR 主要覆盖 `expense`。
- `amount`、`quantity`、`unitPrice` 使用字符串，避免浮点误差。
- `currency` 使用 ISO 4217，例如 `CNY`。
- `occurredAt` 使用 ISO 8601 字符串；FastAPI 应按 NestJS 传入的 `timezone` 理解用户表达，再返回 UTC 或明确偏移的时间。
- `categoryName` 和 `accountHint` 是候选提示，不等同于数据库主键。NestJS 负责匹配或要求用户选择正式 `category_id`、`account_id`。
- `merchant`、`invoiceNo`、`taxNo` 等不确定字段返回 `null`。
- `confidence` 范围为 `0` 到 `1`。
- `rawResult` 进入数据库时对应 `ai_extractions.raw_result`，用于问题排查和后续模型优化，不直接展示给普通用户。

## Privacy And Logging Constraints

- NestJS 只向 FastAPI 发送完成当前 AI 任务所需的最小上下文，不发送账本全量流水、完整成员列表或无关账户数据。
- 票据图片 URL 必须使用短期签名 URL 或内部对象存储引用，日志中只能记录 `storageKey` 的脱敏摘要或 `fileId`。
- 日志不得输出完整 `inputText`、完整 OCR 文本、手机号、邮箱、密码摘要、token、API Key、服务间密钥或完整票据 URL。
- `raw_result` 可能包含模型中间结果和 OCR 文本，应按敏感数据处理，后台查询需要受权限和审计约束。
- FastAPI 日志只记录 `taskId`、`ledgerId`、状态、耗时、错误码和脱敏后的 provider 信息。
- 用户拒绝候选结果时保留 `rejected` 状态，不能为了“清理”直接删除审计线索。
- 票据图片、OCR 文本和 `raw_result` 的实现必须预留 retention/delete 策略字段或任务入口，例如保留期限、计划清理任务、用户删除请求入口和后台补偿清理入口。
- 管理员查看 AI 原始结果时必须默认脱敏，并写入包含管理员、`ledgerId`、`aiTaskId`、查看原因和时间的审计记录。

## Error Handling

FastAPI 内部响应失败时应返回稳定错误码，NestJS 再映射为对外 API 错误。

```json
{
  "taskId": "ai_task_id",
  "status": "failed",
  "error": {
    "code": "AI_PARSE_FAILED",
    "message": "Unable to parse candidate transaction",
    "retryable": false
  }
}
```

建议错误码：

- `AI_PARSE_FAILED`：文本无法解析为可信候选结果。
- `AI_OCR_FAILED`：票据 OCR 失败。
- `AI_PROVIDER_TIMEOUT`：模型或 OCR 供应商超时。
- `AI_PROVIDER_UNAVAILABLE`：供应商不可用。
- `AI_INVALID_INPUT`：输入为空、文件类型不支持或图片不可读取。
- `AI_INTERNAL_ERROR`：未分类内部错误。

处理规则：

- NestJS 必须把失败状态写入 `ai_tasks.status = failed`，并保存可展示的 `error_message`。
- 可重试错误由 NestJS 或 worker 控制重试次数，FastAPI 不自行创建业务任务。
- 对用户展示的错误文案应简洁，不暴露供应商密钥、内部 URL 或模型原始错误。
- 如果候选结果置信度低于产品阈值，NestJS 可以保存候选并提示用户谨慎确认，也可以标记需要手动补全。

## Tests And Verification

模块落地时至少覆盖：

- NestJS AI Controller 只暴露 NestJS 对外接口，前端不直接调用 FastAPI。
- Policy 层校验 `ledger_members`，无权限用户不能创建或查看 AI 任务。
- 文本解析成功后创建 `ai_task` 和 `ai_extraction`，但在用户确认前不创建 `transaction`。
- 票据 OCR 成功后保存 `raw_result` 和候选结果，用户确认后才创建正式流水。
- 用户拒绝候选结果后状态为 `rejected`，不创建交易。
- FastAPI 内部契约测试覆盖成功、低置信度、解析失败、供应商超时和非法输入。
- 日志测试或静态检查确认不输出 token、API Key、完整票据 URL、完整 OCR 文本和完整用户输入。

文档级验证可使用：

```bash
rg -n "NestJS|FastAPI|候选结果|用户确认|ledger|raw_result|Privacy And Logging Constraints|日志不得" docs/modules/ai-service/AI服务规范.md
git diff --check
```

## Future Extensions

- 增加消费洞察、预算提醒、异常支出检测和对话式账本查询。
- 引入更完整的异步事件流，把长耗时 AI 任务从同步 HTTP 调用迁移到队列或事件驱动。
- 为不同账本提供可配置分类偏好、商户别名和账户匹配规则，但仍只发送最小必要上下文。
- 增加模型供应商抽象层，支持多供应商切换、熔断和成本统计。
- 增加 AI 结果反馈闭环，用用户确认、修改、拒绝行为优化提示词和分类策略。
- 增加 `selected_members` 可见范围下的候选结果确认规则，确保私密流水和共享流水的权限一致。
