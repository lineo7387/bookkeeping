# packages/api-client Agent 协作说明

## 包定位

`@bookkeeping/api-client` 是面向前端应用的轻量请求客户端，只负责访问 NestJS 对外 API，并把响应规范化为共享类型。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `.codex/development-rules.md`
3. `docs/modules/shared-packages/共享包说明.md`
4. `docs/api/接口规范.md`
5. 涉及具体业务接口时，阅读对应中文模块文档和 NestJS Controller/DTO

## 推荐 Agent Skills

- `test-driven-development`：新增请求封装、错误规范化或响应解析逻辑前使用。
- `systematic-debugging`：修复请求失败、类型不兼容或构建失败前使用。
- `verification-before-completion`：声明完成、提交或交付前使用。

## 技术栈最佳实践

- 使用 fetch-compatible 的轻量实现，保持浏览器和未来多端可适配。
- 只封装请求拼装、认证头注入点、JSON 序列化、响应解析和错误规范化。
- 返回结构与 `@bookkeeping/shared-types` 中的 `ApiResponse<T>` 保持一致。
- 网络失败、空响应、非标准响应结构和 JSON 解析失败应规范化为失败响应。
- 按业务资源组织方法，避免把所有复杂逻辑塞进单个巨大函数。
- 不保存页面状态，不实现业务确认规则，不替代 NestJS 事务和权限判断。

## 推荐目录架构

当前可以维持单文件；接口增长后按资源拆分：

```txt
src/
  index.ts
  client.ts               # BookkeepingApiClient、createApiClient
  request.ts              # fetch、headers、response normalization
  resources/
    auth.ts
    ledgers.ts
    accounts.ts
    categories.ts
    transactions.ts
    ai.ts
```

`src/index.ts` 统一导出公共 API，不让前端依赖内部文件路径。

## 请求规则

- `baseUrl` 必须指向 NestJS API，例如 `/api` 或业务 API 域名。
- 涉及 AI 文本解析、票据识别、候选确认或拒绝时，只调用 NestJS 暴露的 API。
- 如果接口需要新增跨端契约，先更新 `shared-types`，再更新 client。
- 不在 client 中复制一份重复类型。

## 验证命令

```bash
pnpm --filter @bookkeeping/api-client typecheck
pnpm --filter @bookkeeping/api-client build
```

如果同步修改 `@bookkeeping/shared-types`，应先构建 shared-types，再构建 api-client。

## 禁止事项

- 不要暴露或拼接 FastAPI 内部地址。
- 不要在请求客户端中实现账本权限判断。
- 不要在请求客户端中确认 AI 候选并直接创建正式流水。
- 不要吞掉错误后返回不符合 `ApiResponse` 的结构。
