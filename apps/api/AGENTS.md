# apps/api Agent 协作说明

## 模块定位

`apps/api` 是 NestJS 主业务服务，是系统唯一对外业务 API。它负责认证、权限、账本协作、账户、分类、流水、统计、附件、AI 任务编排、后台管理和数据一致性。

当前已完成认证与会话、用户资料、账本与成员权限、账户、分类、流水基础闭环、M2 账户余额流水联动、基础统计 API、审计日志基础写入与业务接入能力、后台只读 Admin API 基础能力，以及 M4 AI 文本记账 NestJS 闭环和后续加固。M4 低置信度候选会保留 `missingFields` / `reviewMessage` 补全提示，但确认正式流水仍必须重新校验账本权限、账户和分类。Prisma 7 运行时通过 PostgreSQL driver adapter 初始化。正式流水创建、更新、软删除和 AI 候选确认必须在同一个 Prisma transaction 内处理核心状态和相关账户余额。

本地开发可通过 `pnpm --filter @bookkeeping/api admin:bootstrap -- --email <email> --password <password>` 创建或提权系统管理员账号。该脚本只用于本地/运维 bootstrap，不是公开 API。

M4 文本记账本地闭环可在 FastAPI、NestJS 和 PostgreSQL 均启动后运行 `pnpm e2e:m4:ai-text`。该脚本只调用 NestJS 对外 API，不能改成前端、后台 Web、移动端或 `@bookkeeping/api-client` 直接请求 FastAPI。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `.codex/development-rules.md`
3. `docs/modules/api/NestJS服务说明.md`
4. 本次改动对应的中文模块文档
5. 涉及产品或架构边界时，阅读 `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`

如果对应模块文档不存在，应先创建简体中文文档，再实现代码。

## 推荐 Agent Skills

- `nestjs-best-practices`：修改模块、Controller、Service、Guard、Policy、Repository、Prisma 访问层或测试前使用。
- `test-driven-development`：新增业务规则、权限规则、金额或时间校验前优先使用。
- `systematic-debugging`：修复失败测试、权限穿透、金额误差、时区问题前使用。
- `requesting-code-review`：完成跨模块能力或权限敏感改动后使用。
- `verification-before-completion`：声明完成、提交或交付前使用。

技能不能覆盖本项目规则：前端只调用 NestJS、FastAPI 只返回候选结果、所有交易归属于 `ledger`、权限通过 Policy 层判断。

## 技术栈最佳实践

- 使用 NestJS feature module 组织业务能力，避免按纯技术层拆成横向大模块。
- 通过构造函数注入依赖，不使用 service locator 或全局可变单例。
- 避免循环依赖；确实出现跨模块协作时，优先抽出清晰的共享服务或事件。
- Controller 保持薄层，只处理 HTTP 入参、鉴权装饰器、DTO 校验和响应。
- Service 负责业务流程、事务边界、领域规则和异常语义。
- Repository 封装 Prisma 查询，不承载账本权限策略。
- Guard 和 Policy 负责认证与授权，不把权限判断散落到 Controller 或前端。
- DTO 使用 class-validator 表达接口约束，字段名使用英文。
- Prisma 访问注意事务、N+1 查询和 Decimal 金额处理。
- 异常使用 NestJS HTTP exception 或统一异常过滤器，不返回随意结构。

## 推荐目录架构

当前和后续模块优先保持以下形态：

```txt
src/
  common/                 # 通用响应、装饰器、Guard、Pipe、Filter、Interceptor
  prisma/                 # PrismaModule、PrismaService
  policies/               # LedgerPolicy 等权限策略
  auth/
    dto/
    auth.controller.ts
    auth.service.ts
    auth-sessions.repository.ts
    auth.module.ts
  ledgers/
    dto/
    ledgers.controller.ts
    ledgers.service.ts
    ledgers.repository.ts
    ledgers.module.ts
  accounts/
  categories/
  transactions/
  statistics/             # 基础统计
  audit-logs/             # 审计日志基础写入
  ai/                     # M4 AI 任务编排，只调用内部 FastAPI
  attachments/            # 后续票据和对象存储
  admin/                  # 后续后台管理 API
```

单个业务模块内优先保持：

```txt
<feature>/
  dto/
  <feature>.controller.ts
  <feature>.service.ts
  <feature>.repository.ts
  <feature>.module.ts
  <feature>.controller.spec.ts
  <feature>.service.spec.ts
```

复杂模块可以增加 `*.policy.ts`、`*.mapper.ts`、`*.types.ts`，但不要提前抽象。

## 业务硬规则

- 所有交易必须归属于 `ledger`，不要建模为只归属于 `user`。
- 所有协作权限通过 `ledger_members` 和 Policy 层判断。
- 私密账户和私密流水必须在后端过滤，不能依赖前端隐藏。
- 金额使用 Decimal，不使用 float。
- 时间统一存 UTC，账本保存 timezone；交易时间入参必须避免时区歧义。
- 重要删除优先软删除。
- AI 服务只返回候选结果，用户确认后才由 NestJS 创建正式流水。
- M4 文本 AI 候选当前只支持 `income | expense`；不要在未设计目标账户补全规则前开放 transfer 候选确认。
- 内部 FastAPI 调用必须设置超时并校验响应结构，不能把坏候选直接落库。
- 其他模块不得直接调用 FastAPI；只能通过后续 `ai` 模块统一编排。
- 后台 Admin API 必须同时通过 JWT 和 `SystemAdminGuard`，系统管理员权限来自 `users.is_system_admin`，不得替代账本成员 Policy。

## 验证命令

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm verify:scripts
```

窄范围改动可先运行对应 `.spec.ts`，完成前再运行相关包级验证。

## 禁止事项

- 不要绕过 Policy 层直接按 `userId` 判断账本协作权限。
- 不要让 Controller 直接写复杂 Prisma 查询。
- 不要让 FastAPI 创建正式流水或维护主业务状态。
- 不要把前端展示所需的私密过滤逻辑留给前端完成。
- 不要提交 `.env` 中的真实密钥或本地凭据。
