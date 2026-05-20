# apps/admin-web Agent 协作说明

## 模块定位

`apps/admin-web` 是后台管理端，用于运营和排查系统状态。第一阶段重点覆盖系统健康、用户与账本概况、AI 任务队列、审计活动和后续管理入口；当前首页已接入 M3 后台只读 Admin API。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `designer.md`
3. `.codex/development-rules.md`
4. `docs/modules/admin-web/后台Web说明.md`
5. 涉及真实接口时，阅读 `docs/api/接口规范.md` 和对应业务模块文档

如果新增页面或功能入口，应先补充对应简体中文模块说明。

## 推荐 Agent Skills

- `vue-best-practices`：修改 Vue、Vite、`.vue`、组件数据流或 composable 前使用。
- `frontend-design`：新增页面、组件、布局、视觉风格或响应式体验前使用。
- `test-driven-development`：新增可测试逻辑、状态转换、数据适配函数前使用。
- `systematic-debugging`：修复构建、类型、布局或交互异常前使用。
- `browser:browser`：完成本地页面改动后，用浏览器检查桌面和移动视口。
- `verification-before-completion`：声明完成、提交或交付前使用。

## 技术栈最佳实践

- 默认使用 Vue 3 Composition API 和 `<script setup lang="ts">`。
- 保持源状态最小化，能用 `computed` 派生的状态不要重复存储。
- 使用 props down、events up；只有真实双向组件契约才使用 `v-model`。
- 页面级 view 负责组合和数据准备，复杂展示拆到 feature components。
- 可复用或有副作用的逻辑抽到 `composables/useXxx.ts`。
- SFC 顺序保持 `<script>`、`<template>`、`<style scoped>`。
- 常规布局优先 Tailwind CSS；组件私有复杂阴影、动效和状态样式放 scoped style。
- 图标优先使用 `lucide-vue-next`。
- 保持键盘可访问性、焦点状态、响应式布局和 44px 以上触控目标。

## 推荐目录架构

当前和后续后台功能优先保持以下形态：

```txt
src/
  main.ts
  App.vue
  style.css                 # token、字体、reset、跨应用动画
  views/                    # 路由页面，只做组合和页面级状态
    DashboardView.vue
    UsersView.vue
    LedgersView.vue
    AiTasksView.vue
  components/
    layout/                 # Shell、Sidebar、Header、背景
    ui/                     # Button、Input、Badge、Modal 等基础组件
    dashboard/              # 仪表盘展示组件
    users/                  # 后续用户管理组件
    ledgers/                # 后续账本管理组件
  composables/              # useDashboard、usePagination、useApiQuery
  services/                 # 调用 api-client 的轻量适配层
  types/                    # 仅后台局部 UI 类型
  router/                   # 后续路由
  stores/                   # 后续 Pinia store
```

页面文件必须放在 `src/views`。不要把完整页面塞进 `components`。

## 设计规则

- 视觉实现优先遵循根目录 `designer.md`。
- 后台 Web 采用克制版 Soft Clay Admin：保留圆润、柔和阴影和品牌色，但降低装饰密度。
- 信息密集区域优先保证扫描效率，不做展示页式大面积装饰。
- 不要把侧边栏、表格、列表、筛选器做成过度黏土化。
- 不在单个页面散落一次性颜色、阴影、圆角和字体 token。
- 避免在全局样式中放单个组件私有样式。

## API 调用规则

- 当前后台 Web 首页已通过 `@bookkeeping/api-client` 接入 NestJS Admin API。
- 后续接入真实接口时，只能通过 NestJS API。
- 优先通过 `@bookkeeping/api-client` 访问后端，不在组件中直接拼 FastAPI 或内部服务地址。
- API 响应类型优先来自 `@bookkeeping/shared-types`。
- 本地调试默认读取 `VITE_API_BASE_URL` 作为 NestJS API baseUrl，未配置时使用 `/api` 并由 Vite dev server 代理到 `http://127.0.0.1:3000`。
- 后台 Web 已接入 Pinia 和 `pinia-plugin-persistedstate`；会话 token、导航偏好和筛选偏好可进入 store，用户列表、审计日志等敏感查询结果不得持久化。
- `@bookkeeping/api-client` 是跨应用共享 SDK；后台 Web 必须通过 `src/services/apiClient.ts` 这类本应用适配层注入 token、baseUrl 和后续缓存策略，不要在页面组件中直接创建共享 client。

## 验证命令

```bash
pnpm --filter @bookkeeping/admin-web typecheck
pnpm --filter @bookkeeping/admin-web build
```

涉及页面视觉调整时，应启动本地预览并用浏览器检查桌面与移动视口。

## 禁止事项

- 不要直接调用 FastAPI。
- 不要把页面文件放到 `components` 或其他目录替代 `views`。
- 不要在全局 CSS 中堆放页面私有样式。
- 不要把后台管理端做成营销落地页风格。
