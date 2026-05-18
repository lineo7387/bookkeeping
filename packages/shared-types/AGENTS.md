# packages/shared-types Agent 协作说明

## 包定位

`@bookkeeping/shared-types` 存放跨应用共享的 TypeScript 类型、枚举和轻量接口契约，帮助 NestJS、后台 Web、未来移动端和 API client 保持字段命名一致。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `.codex/development-rules.md`
3. `docs/modules/shared-packages/共享包说明.md`
4. 涉及业务模块时，阅读对应中文模块文档、后端 DTO 和 API 文档

## 推荐 Agent Skills

- `test-driven-development`：新增有运行时行为的辅助函数前使用；纯类型变更通常不需要测试文件。
- `systematic-debugging`：修复类型不兼容、构建失败或跨包导出问题前使用。
- `verification-before-completion`：声明完成、提交或交付前使用。

## 技术栈最佳实践

- 保持 TypeScript-only，不引入前端、后端或请求运行时依赖。
- 共享包只表达跨端稳定契约，不承载页面局部状态。
- 类型尽量使用清晰的 enum/union/interface，避免过度泛型。
- 金额使用字符串类型，时间使用 ISO 8601 字符串类型。
- 公共导出集中在 `src/index.ts`，保持 ESM 友好的 `exports`。
- 新增契约时优先与 NestJS DTO、Prisma 字段和接口文档对齐。

## 推荐目录架构

当前可以维持单文件导出；类型增长后按领域拆分：

```txt
src/
  index.ts
  api.ts                  # ApiResponse、ApiError
  ledgers.ts
  accounts.ts
  categories.ts
  transactions.ts
  ai.ts
  statistics.ts
```

拆分后仍由 `src/index.ts` 统一导出，不让调用方依赖内部文件路径。

## 类型规则

- 交易、账户、分类等账本数据类型必须包含 `ledgerId`。
- AI 候选结果只表示待确认建议，不能表达为已创建正式流水。
- 权限相关类型应对应后端 `ledger_members` 和 Policy 层能力，不把前端显示状态误建模为权限来源。
- 共享类型可以服务多端展示，但不能成为业务权限来源。

## 验证命令

```bash
pnpm --filter @bookkeeping/shared-types typecheck
pnpm --filter @bookkeeping/shared-types build
```

如果修改影响 `@bookkeeping/api-client` 或前端应用，应额外运行受影响包的 typecheck 或 build。

## 禁止事项

- 不要引入 Vue、NestJS、Prisma、FastAPI 或请求库依赖。
- 不要在类型包中拼接 API URL。
- 不要把只属于单个页面的 UI 状态放进共享契约。
- 不要用 number 表示金额。
