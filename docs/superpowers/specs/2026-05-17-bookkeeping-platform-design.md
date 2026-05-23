# 智能家庭记账平台设计文档

## 1. 项目定位

本项目第一阶段定位为面向个人与家庭共享场景的智能记账平台，支持多账本、多成员协作、默认共享流水、私密流水、AI 辅助记账与票据识别。

第一阶段不做小商户财务、复杂资产管理、税务、进销存等能力。这些能力可以作为未来扩展方向，但不进入 MVP 主路径。

## 2. 核心目标

- 支持用户注册、登录和设备会话管理。
- 支持创建个人账本和家庭账本。
- 支持家庭成员邀请、成员角色和权限控制。
- 支持账户、分类、收入、支出、转账等基础记账能力。
- 支持默认共享流水，也支持私密流水。
- 支持 AI 文本记账，例如“今天晚饭花了 86”。
- 支持 AI 票据识别，识别结果必须由用户确认后才能生成正式流水。
- 支持基础统计，包括月度收支、分类占比、账户统计、成员消费统计。
- 支持后台管理用户、账本、AI 任务、异常记录和基础配置。

## 3. 核心原则

- MVP 可以小，但领域模型必须为长期扩展留出空间。
- 所有交易归属于账本，而不是直接归属于用户。
- 所有协作权限通过账本成员关系判断。
- AI 服务只生成候选结果，用户确认后才生成正式流水。
- 私密数据能力从第一版开始进入数据模型。
- 每个功能必须有简体中文文档，文档是交付内容的一部分。
- 代码命名、数据库字段和接口字段使用英文；产品文档、模块说明、交接说明使用简体中文。
- 项目脚手架由用户执行创建命令，创建完成后由 Agent 负责配置、目录规范、文档模板和后续修改。
- 根目录 `designer.md` 是项目前端视觉设计系统的基准文档，后台 Web、用户 H5、小程序和 App 的界面设计都应优先遵循该文档。

## 4. 推荐架构

项目采用 pnpm monorepo、NestJS 模块化单体、FastAPI 独立 AI 服务、Vue/uni-app 多端前端。

```txt
Bookkeeping/
  apps/
    api/                  # NestJS 主业务服务
    ai-service/           # FastAPI AI 服务
    admin-web/            # Vue 3 后台管理端
    mobile/               # uni-app 用户端：小程序/App/H5

  packages/
    shared-types/         # 共享类型、枚举、DTO 基础定义
    api-client/           # 前端统一请求 SDK
    validation/           # 共享校验规则
    config/               # tsconfig/eslint/prettier 等

  docs/
    product/
    architecture/
    modules/
    api/
    handover/
    superpowers/specs/

  infra/
    docker/
    nginx/
    scripts/

  docker-compose.yml
  pnpm-workspace.yaml
```

## 5. 服务边界

### 5.1 NestJS 主业务服务

`apps/api` 负责核心业务、权限、数据一致性和对外 API。

建议模块：

```txt
auth              登录、注册、token、设备会话
users             用户资料
ledgers           账本、账本成员、邀请
accounts          现金、银行卡、微信、支付宝、信用卡等账户
categories        收入和支出分类
transactions      流水、转账、附件关联
budgets           预算
statistics        报表统计
attachments       图片、票据、对象存储
ai                AI 任务编排、AI 结果确认
notifications     通知、提醒
admin             后台管理
audit-logs        审计日志
```

设计约束：

- Controller 只处理 HTTP 入参和响应。
- Service 负责业务流程。
- Repository/Prisma 层负责数据访问。
- 权限判断集中在 Guard/Policy，不散落在业务代码中。
- AI 调用只通过 `ai` 模块封装，其他模块不直接调用 FastAPI。

### 5.2 FastAPI AI 服务

`apps/ai-service` 负责 AI 能力，不承担主业务状态。

建议能力：

```txt
text_transaction_parser     文本记账解析
receipt_ocr                 票据识别
category_classifier         自动分类
spending_insights           消费分析
chat_query                  对话式查询
```

NestJS 和 FastAPI 第一阶段通过内部 HTTP API 通信。未来如果 AI 任务量明显增大，可以再引入更完整的事件驱动流程。

### 5.3 前端应用

后台管理端：

```txt
Vue 3 + TypeScript + Vite + Vue Router + Pinia + Element Plus 或 Naive UI
```

用户多端：

```txt
uni-app + Vue 3 + TypeScript
```

第一轮真实可用版本优先支持后台 Web、H5、微信小程序。Android、iOS、鸿蒙保留架构能力，等核心闭环稳定后再扩展。

### 5.4 视觉设计系统

根目录 `designer.md` 定义了项目视觉方向：High-Fidelity Claymorphism。该系统强调数字黏土质感、圆润造型、糖果色点缀、多层阴影、凸起与按压状态、轻量漂浮动效，以及移动优先的响应式布局。

落地要求：

- 前端设计 token 必须集中维护，避免每个页面写一次性颜色、阴影、圆角和字体。
- 关键 token 应覆盖颜色、字体、字号层级、圆角、阴影、动画、间距和交互状态。
- 组件应优先沉淀为可复用基础组件，例如 Card、Button、Input、StatCard、PageShell、EmptyState。
- 后台 Web 可以在保持专业效率的前提下使用该视觉语言，但信息密集区域应降低装饰密度，保证可读性和操作效率。
- 用户端 H5、小程序和 App 可以更完整地表达该视觉语言，突出亲和、轻松和智能记账的产品气质。
- 必须支持响应式布局、44px 以上触控目标、键盘可访问性、焦点状态和 `prefers-reduced-motion`。
- 任何功能页面实现前，应先检查 `designer.md` 并在对应中文功能文档中说明该页面使用的设计模式和组件。

## 6. 数据库设计

数据库使用 PostgreSQL，ORM 推荐 Prisma。Redis 用于缓存、验证码、会话辅助、队列。用户当前本地已经通过 Docker 安装 Redis 和 PostgreSQL，第一阶段可以直接复用。

核心表：

```txt
users
user_sessions
ledgers
ledger_members
ledger_invitations
accounts
categories
transactions
transaction_attachments
budgets
ai_tasks
ai_extractions
audit_logs
```

### 6.1 用户与账本

`users`

```txt
id
email
phone
password_hash
nickname
avatar_url
status
created_at
updated_at
```

`ledgers`

```txt
id
name
type                 personal | family
owner_id
default_currency
timezone
created_at
updated_at
archived_at
```

`ledger_members`

```txt
id
ledger_id
user_id
role                 owner | admin | editor | viewer
status               active | invited | removed
joined_at
created_at
updated_at
```

`ledger_members` 是多成员、多账本和未来组织账本扩展的核心。

### 6.2 邀请

`ledger_invitations`

```txt
id
ledger_id
inviter_id
invitee_email
invitee_phone
role
token
status               pending | accepted | expired | revoked
expires_at
created_at
updated_at
```

第一版可以先实现邀请码或邀请链接，不需要立即实现复杂通讯录邀请。

### 6.3 账户

`accounts`

```txt
id
ledger_id
name
type                 cash | bank_card | alipay | wechat | credit_card | other
currency
initial_balance
current_balance
visibility           ledger | private
owner_id
sort_order
created_at
updated_at
archived_at
```

私密账户仅 `owner_id` 可见。私密账户下创建的流水默认私密。

### 6.4 分类

`categories`

```txt
id
ledger_id
parent_id
type                 income | expense
name
icon
color
is_system
sort_order
created_at
updated_at
archived_at
```

分类模型预留 `parent_id` 支持树形结构。第一版 UI 可以只开放一层分类。

### 6.5 交易流水

`transactions`

```txt
id
ledger_id
account_id
category_id
type                 income | expense | transfer
amount
currency
occurred_at
merchant
note
visibility           ledger | private | selected_members
created_by
source               manual | ai_text | ocr | import
metadata             jsonb
created_at
updated_at
deleted_at
```

第一版转账可以使用一条 `type = transfer` 记录，并在 `metadata` 中保存目标账户信息。Service 层必须封装转账逻辑，避免未来升级双分录模型时影响前端接口。

### 6.6 附件与 AI

`transaction_attachments`

```txt
id
transaction_id
file_url
file_type
storage_key
created_at
```

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
raw_result           jsonb
suggested_transaction jsonb
confidence
status               pending | confirmed | rejected
created_at
updated_at
```

## 7. 权限模型

第一版角色：

```txt
owner
admin
editor
viewer
```

能力规则：

```txt
owner:
  管理账本、删除账本、管理成员、管理账户、管理分类、管理预算、增删改流水

admin:
  管理成员、管理账户、管理分类、管理预算、增删改流水

editor:
  查看共享数据、创建流水、编辑或删除自己创建的流水

viewer:
  只读查看共享数据
```

私密数据规则：

```txt
private transaction:
  只有 created_by 可见和管理

private account:
  只有 owner_id 可见
  该账户下默认创建 private transaction

ledger transaction:
  active 成员按角色可见
```

后端应实现统一 Policy 层：

```txt
canViewLedger(userId, ledgerId)
canManageLedger(userId, ledgerId)
canCreateTransaction(userId, ledgerId)
canUpdateTransaction(userId, transactionId)
canViewTransaction(userId, transactionId)
canViewAccount(userId, accountId)
```

## 8. API 边界

所有前端只调用 NestJS，不直接调用 FastAPI。

认证：

```txt
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
```

账本：

```txt
GET    /ledgers
POST   /ledgers
GET    /ledgers/:ledgerId
PATCH  /ledgers/:ledgerId
DELETE /ledgers/:ledgerId
```

成员：

```txt
GET    /ledgers/:ledgerId/members
POST   /ledgers/:ledgerId/invitations
POST   /ledger-invitations/:token/accept
PATCH  /ledgers/:ledgerId/members/:memberId
DELETE /ledgers/:ledgerId/members/:memberId
```

账户：

```txt
GET    /ledgers/:ledgerId/accounts
POST   /ledgers/:ledgerId/accounts
PATCH  /accounts/:accountId
DELETE /accounts/:accountId
```

分类：

```txt
GET    /ledgers/:ledgerId/categories
POST   /ledgers/:ledgerId/categories
PATCH  /categories/:categoryId
DELETE /categories/:categoryId
```

流水：

```txt
GET    /ledgers/:ledgerId/transactions
POST   /ledgers/:ledgerId/transactions
GET    /transactions/:transactionId
PATCH  /transactions/:transactionId
DELETE /transactions/:transactionId
```

AI：

```txt
POST   /ledgers/:ledgerId/ai/text-parse
POST   /ledgers/:ledgerId/ai/receipt-ocr
GET    /ledgers/:ledgerId/ai/tasks
GET    /ai/tasks/:taskId
POST   /ai/extractions/:extractionId/confirm
POST   /ai/extractions/:extractionId/reject
```

统计：

```txt
GET    /ledgers/:ledgerId/statistics/monthly
GET    /ledgers/:ledgerId/statistics/categories
GET    /ledgers/:ledgerId/statistics/accounts
GET    /ledgers/:ledgerId/statistics/members
```

后台管理：

```txt
GET    /admin/users
GET    /admin/ledgers
GET    /admin/ai/tasks
GET    /admin/audit-logs
```

## 9. API 响应与错误

统一响应结构：

```ts
type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
```

常见错误码：

```txt
AUTH_REQUIRED
TOKEN_EXPIRED
LEDGER_NOT_FOUND
LEDGER_ACCESS_DENIED
MEMBER_ROLE_DENIED
ACCOUNT_NOT_FOUND
PRIVATE_RESOURCE_DENIED
VALIDATION_FAILED
AI_TASK_FAILED
RATE_LIMITED
```

后端返回账本信息时，应包含当前用户角色和能力，方便多端统一控制 UI：

```json
{
  "id": "ledger_id",
  "name": "家庭账本",
  "type": "family",
  "currentMember": {
    "role": "admin",
    "permissions": [
      "transaction:create",
      "transaction:update",
      "account:create",
      "member:invite"
    ]
  }
}
```

## 10. AI 流程

### 10.1 文本记账

用户输入：

```txt
今天晚饭花了86，微信支付
```

流程：

```txt
mobile
  -> POST /ledgers/:ledgerId/ai/text-parse
  -> NestJS 校验账本权限
  -> NestJS 创建 ai_task
  -> NestJS 调用 FastAPI /ai/text-transaction
  -> FastAPI 返回候选结构
  -> NestJS 保存 ai_extraction
  -> 前端展示确认页
  -> 用户确认
  -> POST /ai/extractions/:id/confirm
  -> NestJS 创建 transaction
```

候选结果示例：

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

### 10.2 票据识别

图片 OCR 使用异步流程：

```txt
上传图片
  -> NestJS 保存图片到对象存储
  -> 创建 ai_task: pending
  -> BullMQ 投递任务
  -> worker 调用 FastAPI OCR
  -> 保存 ai_extraction
  -> 前端轮询或 WebSocket 获取结果
  -> 用户确认生成 transaction
```

第一版使用轮询 `GET /ai/tasks/:taskId`，后续再增加 WebSocket 或推送。

### 10.3 AI 财务问答与洞察

后续规划支持用户用自然语言询问账本数据，例如：

```txt
这周消费了多少钱，主要是用在什么地方？
```

该能力不属于 M4 文本记账，也不允许 AI 直接访问数据库。推荐采用受控工具调用：

```txt
mobile
  -> POST /ledgers/:ledgerId/ai/insights/chat
  -> NestJS 校验账本权限和可见性边界
  -> NestJS 创建 ai_task: insight
  -> FastAPI/LLM 返回结构化 intent 分类
  -> NestJS 根据 intent 决定是否进入账本工具、M4 候选流程、应用帮助或通用回答
  -> NestJS 将可用工具、问题和最小必要上下文传给 FastAPI/LLM
  -> LLM 选择统计工具或查询工具
  -> NestJS 执行真实统计/流水查询
  -> LLM 基于查询结果生成自然语言答复
  -> NestJS 保存脱敏任务摘要和结构化引用数据
  -> 前端展示答复、金额来源和可追溯统计口径
```

关键原则：

- 金额、分类占比、时间范围和成员汇总必须来自 NestJS 查询结果，不由模型编造。
- FastAPI/LLM 负责意图分类、理解问题、选择工具和组织答复，不承担认证、权限、主业务状态或直接数据库访问。
- 工具能力应优先复用现有统计 API 和流水查询能力，例如月度收支、分类占比、账户余额、成员消费和时间范围流水摘要。
- 涉及私密流水、共享流水和家庭成员数据时，仍必须复用 Ledger Policy 和交易可见性规则。
- 系统管理员后台默认只查看脱敏 AI 任务摘要，不展示用户原始提问、完整模型输出或完整账本明细。

intent 分类第一版至少区分：

- `ledger_insight`：账本数据问题，必须走受控工具查询。
- `text_accounting`：记账录入问题，转入 M4 文本记账候选确认流程。
- `app_help`：应用使用问题，只返回产品帮助或页面引导。
- `general_knowledge`：通用知识或闲聊，不调用账本工具，可直接回答或礼貌收敛到记账助手定位。
- `unsupported`：超出产品边界或高风险问题，拒绝或给出安全提示。

## 11. 索引与数据原则

建议索引：

```txt
ledger_members(ledger_id, user_id)
accounts(ledger_id, visibility)
categories(ledger_id, type)
transactions(ledger_id, occurred_at)
transactions(ledger_id, category_id)
transactions(ledger_id, account_id)
transactions(created_by)
ai_tasks(ledger_id, status)
```

数据原则：

- 金额使用 Decimal，不使用 float。
- 时间统一存 UTC，账本保留 timezone。
- 删除以软删除为主，尤其是流水。
- 敏感操作写入 `audit_logs`。
- 多端统一走 DTO/API SDK，不直接拼接字段。
- `metadata jsonb` 只放扩展信息，核心字段必须结构化。

## 12. 中文文档规范

每个功能必须包含中文文档。文档至少包括：

- 功能目标
- 业务规则
- 数据模型
- 接口说明
- 权限规则
- 异常情况
- 测试与验证方式
- 后续扩展点

建议文档结构：

```txt
docs/
  README.md
  product/
    需求说明.md
    迭代路线.md
  architecture/
    总体架构.md
    数据库设计.md
    权限模型.md
    AI服务设计.md
    多端设计.md
  modules/
    auth/
      认证模块说明.md
    ledgers/
      账本模块说明.md
    transactions/
      流水模块说明.md
    ai/
      AI记账说明.md
  api/
    接口规范.md
  handover/
    开发交接说明.md
```

功能开发顺序：

```txt
1. 中文功能文档
2. 数据模型和接口设计
3. 后端实现
4. 前端实现
5. 测试与验证
6. 文档更新
```

## 13. 迭代路线

### M0：项目底座

目标：项目能跑起来。

范围：

```txt
pnpm workspace
NestJS api
FastAPI ai-service
Vue admin-web
uni-app mobile
PostgreSQL/Redis 配置
Prisma 初始化
基础 env 管理
代码规范
中文文档模板
```

### M1：账号与账本

目标：用户能注册登录，创建家庭账本。

范围：

```txt
注册/登录/JWT
用户资料
创建账本
账本成员表
邀请成员基础能力
角色权限 Policy
```

### M2：基础记账闭环

目标：能正常记一笔账并查看列表。

范围：

```txt
账户管理
分类管理
收入/支出/转账
共享/私密流水
流水列表、筛选、详情
基础账户余额
```

### M3：统计与后台

目标：用户能看懂账，管理员能排查问题。

范围：

```txt
月度收支
分类占比
账户统计
成员消费统计
后台用户管理
后台账本管理
审计日志
```

### M4：AI 文本记账

目标：自然语言生成候选流水。

范围：

```txt
FastAPI 文本解析
ai_task
ai_extraction
候选结果确认/拒绝
确认后生成 transaction
```

### M5：票据 OCR 与文件

目标：上传票据生成候选流水。

范围：

```txt
对象存储
图片上传
OCR 异步任务
任务状态
候选结果确认
```

### M6：AI 财务问答与洞察

目标：用户能用自然语言询问账本数据，并得到基于真实查询结果的准确分析。

范围：

```txt
AI 问答任务类型
受控工具调用
账本权限与可见性校验
统计/流水查询工具
结构化引用数据
自然语言分析答复
```

## 14. 项目创建协作约定

创建框架时，Agent 只给出创建命令提示，由用户执行。用户执行完成后，Agent 再负责修改配置和补充规范。

示例：

```bash
pnpm create nest apps/api
pnpm create vite apps/admin-web --template vue-ts
```

实际命令以后会根据当前工具链和项目状态逐步确认，不一次性要求创建全部应用。

## 15. 待后续确认

- 后台 UI 组件库选择 Element Plus 还是 Naive UI。
- uni-app 创建方式和目标端优先级。
- AI 第一阶段真实模型供应商与 API Key 管理方式；M4 当前可用 deterministic parser，本项主要影响后续真实模型解析和 M6 AI 财务问答。
- 对象存储第一阶段使用 MinIO、本地存储还是云厂商 OSS。
- 是否立即初始化 git 仓库。
