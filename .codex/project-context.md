# 项目上下文

## 一句话概述

Bookkeeping 是一个面向个人与家庭共享场景的智能记账平台，包含 NestJS 主业务服务、FastAPI AI 服务、Vue 后台、uni-app 用户端，以及面向未来多端和多 AI 能力扩展的工程底座。

## 第一阶段产品范围

- 用户注册、登录和设备会话。
- 个人账本和家庭账本。
- 家庭成员邀请、成员角色和权限。
- 账户、分类、收入、支出、转账。
- 默认共享流水和私密流水。
- AI 文本记账。
- AI 票据识别。
- 月度收支、分类占比、账户统计、成员消费统计。
- 后台用户、账本、AI 任务和审计管理。

## 非第一阶段范围

- 小商户财务。
- 税务和进销存。
- 复杂资产管理。
- 完整双分录会计系统。
- Android、iOS、鸿蒙全量上架流程。

## 核心建模原则

- 交易属于账本：`transactions.ledger_id`。
- 交易由成员创建：`transactions.created_by`。
- 权限来自成员关系：`ledger_members`。
- AI 结果必须先进入候选表，用户确认后才能生成正式流水。
- 私密流水和私密账户从第一版进入模型。

## 当前工程状态

- 根目录 pnpm workspace 已初始化。
- `apps/api` 已创建，当前包含 NestJS 11、Prisma 7、`@prisma/adapter-pg`、`@nestjs/config`、PrismaService、认证与会话、JWT Guard、用户模块、账本模块、成员角色管理、Ledger Policy 层、账户、分类、流水 API、M2 账户余额流水联动、基础统计 API、审计日志基础写入与业务接入能力、M3 后台只读 Admin API 基础能力，以及 M4 AI 文本记账 NestJS 闭环首版和后续加固。
- `apps/admin-web` 已创建，当前为 Vue 3、TypeScript、Vite、Tailwind CSS、`lucide-vue-next`，已通过 `@bookkeeping/api-client` 接入 NestJS 登录接口和 M3/M4 后台只读 Admin API；系统管理员登录后 access token 写入 Pinia 持久化会话，首页 AI 任务队列和独立 AI 任务列表页已支持状态/类型筛选。本地 Vite dev server 已配置 `/api` 代理到 `http://127.0.0.1:3000`。
- `apps/ai-service` 已由用户使用 `uv` 创建 FastAPI 最小项目，当前包含 M4 文本记账内部契约 `POST /internal/ai/text-transaction` 的确定性 MVP parser、低置信度候选补全提示、pytest 契约测试，以及本地运行和故障排查文档示例。
- `packages/shared-types` 已创建，提供统一 API 响应、认证响应、账本权限、AI 任务、AI 候选结果、低置信度补全字段、确认结果等基础类型。
- `packages/api-client` 已创建，只封装前端访问 NestJS API 的轻量请求能力，当前包含登录、AI 文本解析、账本 AI 任务查询、任务详情、候选确认/拒绝和 Admin 只读列表入口；Admin AI 任务列表支持 `status` / `type` 筛选参数。
- `apps/mobile` 尚未创建。
- M2 账户余额流水联动已完成；M3 基础统计 API、审计日志基础写入与业务接入能力、后台只读 Admin API 基础能力和后台 Web 真实 Admin API 接入已完成首版。后台 API 当前包含 `users.is_system_admin`、`SystemAdminGuard`、用户列表、账本列表、真实 AI 任务摘要列表和审计日志查询；账本、成员、账户、分类和流水成功写操作已写入审计日志；后台 Web 提供系统管理员登录页，展示这些只读接口的首屏分页样本，并可在首页和独立 AI 任务列表页按状态/类型筛选 AI 任务摘要。
- M4 AI 文本记账已完成 NestJS 闭环首版和后续加固：`ai_tasks`、`ai_extractions`、`AiModule`、内部 FastAPI client、文本解析任务、候选保存、确认/拒绝、低置信度候选 `missingFields` / `reviewMessage` 补全提示，以及确认后创建 `source = ai_text` 的正式流水并复用账户余额联动逻辑；内部 FastAPI 调用已有超时与响应校验，AI 确认审计日志支持同事务写入，`/admin/ai/tasks` 支持状态/类型筛选；本地运行、NestJS-to-FastAPI 联调、`pnpm e2e:m4:ai-text` 闭环脚本和故障排查示例已补入 M4 中文模块文档。本地启动验证已确认 FastAPI 可通过 `uvicorn` 启动，NestJS 可连接 PostgreSQL 并完成注册写库。FastAPI 仍只返回候选结果，前端和 `api-client` 仍只调用 NestJS。
- `.codex/checklists/startup.md` 和 `.codex/checklists/handoff.md` 已用于替代每轮重复粘贴长提示词；根目录提供 `verify:admin-web`、`verify:api`、`verify:scripts`、`verify:workspace-light` 和 `e2e:m4:ai-text`，并已提供轻量 `.githooks/pre-commit`。本地系统管理员账号可通过 `apps/api` 的 `admin:bootstrap` 脚本创建或提权。

## 当前模块文档

- `docs/modules/api/NestJS服务说明.md`
- `docs/modules/auth/认证与会话说明.md`
- `docs/modules/ledgers/账本与成员权限说明.md`
- `docs/modules/accounts/账户说明.md`
- `docs/modules/categories/分类说明.md`
- `docs/modules/transactions/流水说明.md`
- `docs/modules/statistics/基础统计说明.md`
- `docs/modules/audit-logs/审计日志说明.md`
- `docs/modules/admin/Admin后台接口说明.md`
- `docs/modules/admin-web/后台Web说明.md`
- `docs/modules/ai/AI文本记账说明.md`
- `docs/modules/ai-service/AI服务规范.md`
- `docs/modules/shared-packages/共享包说明.md`

## 推荐应用结构

```txt
apps/
  api/
  ai-service/
  admin-web/
  mobile/

packages/
  shared-types/
  api-client/
  validation/
  config/
```

## 视觉系统

根目录 `designer.md` 是前端视觉系统基准，风格为 High-Fidelity Claymorphism。后台 Web 可以适当克制装饰密度，用户端应更完整表达圆润、柔软、轻量动效和高触感风格。

## 推荐技能

- NestJS 后端开发、审查和重构优先使用 `nestjs-best-practices`，用于模块边界、依赖注入、Guard/Policy、安全和测试惯例。
- FastAPI AI 服务开发、审查和重构优先使用 `fastapi`，用于路由、Pydantic、依赖声明、错误处理和测试惯例。
- 以上技能只作为框架实践辅助；项目边界仍以 `AGENTS.md`、`.codex/development-rules.md` 和中文模块文档为准。
