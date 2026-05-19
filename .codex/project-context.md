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
- `apps/api` 已创建，当前包含 NestJS 11、Prisma 7、`@nestjs/config`、PrismaService、认证与会话、JWT Guard、用户模块、账本模块、成员角色管理、Ledger Policy 层、账户、分类、流水 API，以及 M2 账户余额流水联动。
- `apps/admin-web` 已创建，当前为 Vue 3、TypeScript、Vite、Tailwind CSS、`lucide-vue-next`，首页仍使用静态数据。
- `packages/shared-types` 已创建，提供统一 API 响应、账本权限、AI 候选结果等基础类型。
- `packages/api-client` 已创建，只封装前端访问 NestJS API 的轻量请求能力。
- `apps/ai-service` 和 `apps/mobile` 尚未创建。
- M2 账户余额流水联动已完成；下一阶段优先进入基础统计、AI 编排或后续脚手架。

## 当前模块文档

- `docs/modules/api/NestJS服务说明.md`
- `docs/modules/auth/认证与会话说明.md`
- `docs/modules/ledgers/账本与成员权限说明.md`
- `docs/modules/accounts/账户说明.md`
- `docs/modules/categories/分类说明.md`
- `docs/modules/transactions/流水说明.md`
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
