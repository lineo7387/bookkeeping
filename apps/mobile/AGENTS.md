# apps/mobile Agent 协作说明

## 模块定位

`apps/mobile` 是规划中的用户多端应用，面向 H5、小程序、App 等个人与家庭记账场景。它负责用户日常记账、账本协作、账户分类、流水确认、AI 文本记账和票据识别确认体验。

当前仅维护协作说明，尚未创建 uni-app 代码脚手架。创建脚手架命令应由用户执行。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `designer.md`
3. `.agents/development-rules.md`
4. 移动端相关中文模块文档；如果不存在，应先创建
5. 涉及接口时，阅读 `docs/api/接口规范.md` 和对应业务模块文档

## 推荐 Agent Skills

- `vue-best-practices`：修改 Vue、`.vue`、组件数据流或 composable 前使用。
- `frontend-design`：新增页面、表单、记账流程、确认体验或响应式布局前使用。
- `test-driven-development`：新增数据适配、金额处理、表单规则或状态转换前使用。
- `systematic-debugging`：修复多端编译、布局、表单或接口异常前使用。
- `verification-before-completion`：声明完成、提交或交付前使用。

## 技术栈最佳实践

- 使用 uni-app + Vue 3 + TypeScript。
- 默认使用 Composition API 和 `<script setup lang="ts">`。
- 移动端以真实任务流为中心：快速记账、候选确认、流水查看、家庭协作。
- 页面保持轻量，复杂逻辑抽到 composables 或 services。
- 所有接口通过 NestJS API 和 `@bookkeeping/api-client` 适配，不直接调用 FastAPI。
- 金额展示和输入避免 float 计算，使用字符串或 Decimal 适配工具。
- 触控目标不小于 44px，优先移动端单手操作和低认知负担。
- 小程序、H5、App 差异应通过平台适配层隔离，不在业务页面散落条件判断。

## 推荐目录架构

脚手架创建后优先保持以下形态：

```txt
src/
  pages/
    dashboard/
    transactions/
    accounts/
    categories/
    ai-confirm/
    settings/
  components/
    ui/
    transaction/
    ledger/
    ai/
  composables/
    useLedger.ts
    useTransactionForm.ts
    useAiCandidate.ts
  services/
    api.ts
    storage.ts
  stores/
    auth.ts
    ledger.ts
  styles/
    tokens.css
    global.css
  types/
```

## 设计规则

- 视觉实现优先遵循 `designer.md`。
- 用户端可以比后台更完整表达 High-Fidelity Claymorphism，但必须保证表单、列表、金额和账本信息可读。
- 记账主流程优先减少输入步骤，不为了装饰牺牲效率。
- 私密账户和私密流水要有明确但克制的视觉标识。

## 验证命令

脚手架创建后以实际 package scripts 为准，优先提供：

```bash
pnpm --filter @bookkeeping/mobile typecheck
pnpm --filter @bookkeeping/mobile build
```

## 禁止事项

- 不要直接调用 FastAPI。
- 不要在前端实现账本权限判断作为安全边界。
- 不要用 number 做金额运算。
- 不要把平台差异代码散落在所有页面里。
