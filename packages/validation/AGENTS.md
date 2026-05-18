# packages/validation Agent 协作说明

## 包定位

`packages/validation` 是规划中的共享校验包，用于沉淀跨端可复用的字段规则、格式规则和轻量校验工具。当前仅维护协作说明，尚未创建代码脚手架。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `.codex/development-rules.md`
3. `docs/modules/shared-packages/共享包说明.md`
4. 涉及业务字段时，阅读对应中文模块文档和 NestJS DTO

## 推荐 Agent Skills

- `test-driven-development`：新增校验函数、金额规则、时间规则或跨端转换逻辑前使用。
- `systematic-debugging`：修复边界值、时区、金额精度或类型导出问题前使用。
- `verification-before-completion`：声明完成、提交或交付前使用。

## 技术栈最佳实践

- 保持 TypeScript-only，优先提供纯函数和可测试规则。
- 避免依赖 Vue、NestJS、FastAPI、Prisma 等框架。
- 校验规则应与后端 DTO 保持语义一致，但不替代后端安全校验。
- 金额、时间、手机号、邮箱、账本名称等规则应有边界测试。
- 若未来使用 Zod、Valibot 或自定义规则，应先在中文文档中说明选型原因。

## 推荐目录架构

脚手架创建后优先保持以下形态：

```txt
src/
  index.ts
  amount.ts
  datetime.ts
  identity.ts
  ledger.ts
  transaction.ts
  tests/
```

## 禁止事项

- 不要把权限判断放入 validation 包。
- 不要访问网络、数据库或本地存储。
- 不要让前端校验替代 NestJS DTO 和 Policy。
