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

## 环境变量

见 `apps/api/.env.example`。

## 验证方式

```bash
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api build
```

## 后续扩展点

- 增加全局异常过滤器。
- 增加统一响应拦截器。
- 增加请求日志和审计日志。
- 增加 PrismaService。
- 增加认证、账本、成员和权限模块。

## M1 模块文档

- `docs/modules/auth/认证与会话说明.md`
- `docs/modules/ledgers/账本与成员权限说明.md`
