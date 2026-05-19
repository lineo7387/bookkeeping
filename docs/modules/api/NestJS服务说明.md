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
- ORM：Prisma 7
- 数据库：PostgreSQL
- 已完成基础设施：`PrismaModule`、`PrismaService`、统一 `ApiResponse` helper、全局 ValidationPipe。
- 已完成认证基础：用户注册、登录、刷新 token、退出、`GET /auth/me`、JWT Strategy 和 `JwtAuthGuard`。
- 已完成账本基础：创建账本、查询账本列表/详情、更新账本、归档账本、成员列表、成员角色更新、移除成员。
- 已完成权限基础：`LedgerPolicyService` 和 `LedgerPolicyGuard`，账本访问和管理权限通过 `ledger_members` 判断。
- 已完成 M1.5 记账基础闭环：账户、分类、流水 Prisma 模型和 NestJS API，支持私密账户、私密流水、基础转账 metadata、软删除、Decimal 金额和 Policy 权限边界。
- 已完成基础统计 API：月度收入/支出汇总、分类占比、账户余额统计和成员消费统计，统计查询按当前用户过滤私密流水和私密账户。
- 已完成数据模型：`users`、`user_sessions`、`ledgers`、`ledger_members`、`ledger_invitations`、`accounts`、`categories`、`transactions`。

## 环境变量

见 `apps/api/.env.example`。

## 验证方式

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

## 后续扩展点

- 增加全局异常过滤器。
- 增加统一响应拦截器。
- 增加请求日志和审计日志。
- 增加认证 E2E 测试和真实数据库集成测试。
- 增加邀请链接和邀请接受流程。
- 增加余额重算、AI 任务编排模块。

## M1/M1.5 模块文档

- `docs/modules/auth/认证与会话说明.md`
- `docs/modules/ledgers/账本与成员权限说明.md`
- `docs/modules/accounts/账户说明.md`
- `docs/modules/categories/分类说明.md`
- `docs/modules/transactions/流水说明.md`
- `docs/modules/statistics/基础统计说明.md`
