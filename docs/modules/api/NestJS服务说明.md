# NestJS 服务说明

## 功能目标

NestJS 服务是系统唯一对外业务 API，负责认证、权限、账本协作、记账流水、统计、文件、AI 任务编排和后台管理。

## 业务规则

- 前端只调用 NestJS，不直接调用 FastAPI。
- 所有账本数据访问必须校验成员关系。
- 所有交易流水必须归属于 `ledger`。
- 私密账户和私密流水必须在后端做权限过滤。
- AI 结果必须先保存为候选结果，用户确认后才创建正式流水。

## 当前工程状态

- 应用路径：`apps/api`
- 包名：`@bookkeeping/api`
- 框架：NestJS 11
- 配置：`@nestjs/config`
- ORM：Prisma 7，运行时通过 `@prisma/adapter-pg` 连接 PostgreSQL。
- 数据库：PostgreSQL
- 已完成基础设施：`PrismaModule`、`PrismaService`、统一 `ApiResponse` helper、全局 ValidationPipe。
- 已完成认证基础：用户注册、登录、刷新 token、退出、`GET /auth/me`、JWT Strategy 和 `JwtAuthGuard`。
- 已完成账本基础：创建账本、查询账本列表/详情、更新账本、归档账本、成员列表、成员角色更新、移除成员。
- 已完成权限基础：`LedgerPolicyService` 和 `LedgerPolicyGuard`，账本访问和管理权限通过 `ledger_members` 判断。
- 已完成 M1.5 记账基础闭环：账户、分类、流水 Prisma 模型和 NestJS API，支持私密账户、私密流水、基础转账 metadata、软删除、Decimal 金额和 Policy 权限边界。
- 已完成基础统计 API：月度收入/支出汇总、分类占比、账户余额统计和成员消费统计，统计查询按当前用户过滤私密流水和私密账户。
- 已完成审计日志基础写入与业务接入：`audit_logs` Prisma 模型、`AuditLogsModule`、Repository、Service、metadata 敏感字段脱敏，以及账本、成员、账户、分类、流水成功写操作审计。
- 已完成 M3 后台管理 API 基础能力：`users.is_system_admin`、`SystemAdminGuard`、只读用户列表、账本列表、AI 任务摘要列表和审计日志查询。
- 已完成 M4 AI 文本记账 NestJS 闭环首版：`AiModule`、`ai_tasks`、`ai_extractions`、内部 FastAPI client、文本解析任务、候选保存、候选确认/拒绝、低置信度候选补全提示，以及确认后创建 `source = ai_text` 正式流水并复用账户余额联动逻辑。
- 已提供 `pnpm e2e:m4:ai-text` 本地闭环联调脚本，脚本通过 NestJS 对外 API 创建测试用户、账本、账户、分类、AI 文本任务和正式流水，不直接请求 FastAPI。
- 已完成数据模型：`users`、`user_sessions`、`ledgers`、`ledger_members`、`ledger_invitations`、`accounts`、`categories`、`transactions`、`ai_tasks`、`ai_extractions`、`audit_logs`。其中 `users.is_system_admin` 表示平台系统管理员权限，不替代账本成员权限。

## 环境变量

见 `apps/api/.env.example`。M4 AI 文本记账新增 `AI_SERVICE_BASE_URL`，用于 NestJS AI 模块调用 internal-only FastAPI 服务，前端和 `@bookkeeping/api-client` 不使用该地址。

本地首次启动前，应确保 Docker PostgreSQL 中存在 `.env` 指向的 role 和 database。当前示例值为 `bookkeeping` / `bookkeeping`，可用以下命令检查：

```bash
docker exec postgres-container pg_isready -U bookkeeping -d bookkeeping
pnpm --filter @bookkeeping/api prisma db push
```

`PrismaService` 会在启动时读取 `DATABASE_URL` 并创建 PostgreSQL adapter；缺少 `DATABASE_URL`、数据库 role/database 未初始化，或未安装 `@prisma/adapter-pg` 都会导致 NestJS 启动失败。

## 验证方式

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
pnpm verify:scripts
```

本地 FastAPI、NestJS 和 PostgreSQL 均启动后，可额外运行：

```bash
pnpm e2e:m4:ai-text
```

## 后续扩展点

- 增加全局异常过滤器。
- 增加统一响应拦截器。
- 后续后台写操作出现后，按独立设计文档接入审计日志。
- 增加认证 E2E 测试和真实数据库集成测试。
- 增加邀请链接和邀请接受流程。
- 增加余额重算。
- M5 后续可进入票据 OCR 与文件；M6 规划为 AI 财务问答与洞察，NestJS 必须负责账本权限、可见性校验、受控工具执行和真实查询结果返回，FastAPI/LLM 不直接访问数据库。

## M1/M1.5 模块文档

- `docs/modules/auth/认证与会话说明.md`
- `docs/modules/ledgers/账本与成员权限说明.md`
- `docs/modules/accounts/账户说明.md`
- `docs/modules/categories/分类说明.md`
- `docs/modules/transactions/流水说明.md`
- `docs/modules/statistics/基础统计说明.md`
- `docs/modules/audit-logs/审计日志说明.md`
- `docs/modules/admin/Admin后台接口说明.md`
- `docs/modules/ai/AI文本记账说明.md`
