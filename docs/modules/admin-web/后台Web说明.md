# 后台 Web 说明

## 功能目标

后台 Web 用于运营和排查，第一阶段重点展示系统健康、用户与账本概况、AI 任务队列、审计活动和后续管理入口。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- lucide-vue-next
- Pinia
- pinia-plugin-persistedstate

## 页面结构

- 页面文件放在 `apps/admin-web/src/views`。
- 可复用组件放在 `apps/admin-web/src/components`。
- 全局设计 token、字体、基础 reset 和动画放在 `apps/admin-web/src/style.css`。
- 组件独有样式写在对应 `.vue` 文件的 `<style scoped>` 中。
- 页面和组件布局优先使用 Tailwind CSS utility class。
- 后台 Web 只能调用 NestJS 对外 API，不直接调用 FastAPI。

## 当前页面

- `DashboardView.vue`：后台运营总览。
- `ClayBackground.vue`：黏土风格背景氛围。
- `ClayButton.vue`：基础按钮。
- `StatCard.vue`：指标卡片。
- `TaskPanel.vue`：任务队列。
- `ActivityPanel.vue`：最近活动。

## 真实接口接入

- 首页已通过 `@bookkeeping/api-client` 接入 NestJS Admin API：
  - `GET /admin/users`
  - `GET /admin/ledgers`
  - `GET /admin/ai/tasks`，当前首页使用首屏分页样本；后续 AI 任务页可传 `status` / `type` 筛选。
  - `GET /admin/audit-logs`
- 当前展示首屏分页样本，默认请求 `limit=20&offset=0`，不在 M3 实现搜索、筛选或分页操作。
- `apps/admin-web/src/services/apiClient.ts` 负责创建后台 Web 本地 API client，并注入 baseUrl、fetch、token 等应用级配置。
- `apps/admin-web/src/services/adminApi.ts` 负责调用本地 API client 并并发拉取后台数据。
- `apps/admin-web/src/services/adminDashboard.ts` 负责把 API 响应转换为页面统计卡、AI 任务队列、审计活动和状态提示。
- `apps/admin-web/src/composables/useAdminDashboard.ts` 负责加载状态、错误状态和刷新动作。
- `DashboardView.vue` 只负责页面组合，不直接拼接后端 URL。
- 本地调试默认使用 `VITE_API_BASE_URL` 作为 NestJS API baseUrl；未配置时使用 `/api`，由 Vite dev server 代理到 `http://127.0.0.1:3000`。
- 系统管理员 access token 由 `stores/adminSession.ts` 的 Pinia store 管理，并通过 `pinia-plugin-persistedstate` 持久化到 `bookkeeping_admin_session`。后台认证 UI 属于后续独立功能，不能在 M3 中临时绕过 `SystemAdminGuard`。

## 状态管理

- 后台 Web 当前已接入 Pinia，`main.ts` 统一安装 Pinia 与持久化插件。
- `stores/adminSession.ts` 只保存后台会话最小状态：`accessToken` 和派生的 `isAuthenticated`。
- 持久化范围必须谨慎控制：允许保存会话引用、导航偏好和筛选偏好；不要持久化用户列表、审计日志、账本明细等敏感查询结果。
- 页面级加载状态仍优先放在 composable 内；当状态需要跨页面复用、导航缓存或 DevTools 跟踪时，再提升到 Pinia store。
- `@bookkeeping/api-client` 是跨应用共享 SDK；`apps/admin-web/src/services/apiClient.ts` 是后台 Web 的二次封装层。页面和业务 composable 应依赖本地适配层，避免把 token、baseUrl、持久化或缓存策略泄露到共享 SDK。

## 设计规则

- 视觉风格遵循根目录 `designer.md`。
- 后台采用克制版 Soft Clay Admin：保留圆润、柔和阴影和品牌色，但降低装饰密度，优先保证信息扫描效率。
- 侧边栏和导航应保持轻量，不使用强按压阴影作为默认 active 状态。
- 页面层必须放在 `views` 目录。
- 组件使用 Vue 3 Composition API 和 `<script setup lang="ts">`。
- 页面组件负责组合，展示组件通过 props 接收数据。
- 全局样式只放跨应用共享内容，不放单个组件私有样式。
- 优先使用 Tailwind CSS，复杂黏土阴影和动效可用 scoped CSS 补充。
- 接口访问应通过统一 API client 获取数据，不在组件里直接拼 URL。

## 验证方式

```bash
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/admin-web typecheck
pnpm --filter @bookkeeping/admin-web build
```
