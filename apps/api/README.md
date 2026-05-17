# Bookkeeping API 服务

## 服务定位

`apps/api` 是 Bookkeeping 的 NestJS 主业务服务，负责认证、权限、账本、成员、账户、分类、流水、统计、附件、AI 任务编排和后台管理。

## 当前状态

- 已完成 NestJS 脚手架初始化。
- 已接入 `@nestjs/config`。
- 已初始化 Prisma 7 配置。
- 已提供 `.env.example`。

## 本地环境变量

复制示例文件：

```bash
cp apps/api/.env.example apps/api/.env
```

然后按本地 Docker PostgreSQL 配置修改：

```txt
DATABASE_URL="postgresql://bookkeeping:bookkeeping@localhost:5432/bookkeeping?schema=public"
```

## 常用命令

```bash
pnpm --filter @bookkeeping/api dev
pnpm --filter @bookkeeping/api build
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api prisma:generate
pnpm --filter @bookkeeping/api prisma:migrate
```

## 开发规则

- Controller 只处理 HTTP 入参和响应。
- Service 负责业务流程。
- Prisma 层负责数据访问。
- 权限判断集中在 Guard/Policy。
- AI 服务只通过 API 模块中的 AI 编排能力调用。
- 新增任何功能前，必须先补对应中文模块文档。
