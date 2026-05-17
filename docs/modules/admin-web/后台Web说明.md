# 后台 Web 说明

## 功能目标

后台 Web 用于运营和排查，第一阶段重点展示系统健康、用户与账本概况、AI 任务队列、审计活动和后续管理入口。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- lucide-vue-next

## 页面结构

- 页面文件放在 `apps/admin-web/src/views`。
- 可复用组件放在 `apps/admin-web/src/components`。
- 全局设计 token、字体、基础 reset 和动画放在 `apps/admin-web/src/style.css`。
- 组件独有样式写在对应 `.vue` 文件的 `<style scoped>` 中。
- 页面和组件布局优先使用 Tailwind CSS utility class。

## 当前页面

- `DashboardView.vue`：后台运营总览。
- `ClayBackground.vue`：黏土风格背景氛围。
- `ClayButton.vue`：基础按钮。
- `StatCard.vue`：指标卡片。
- `TaskPanel.vue`：任务队列。
- `ActivityPanel.vue`：最近活动。

## 设计规则

- 视觉风格遵循根目录 `designer.md`。
- 页面层必须放在 `views` 目录。
- 组件使用 Vue 3 Composition API 和 `<script setup lang="ts">`。
- 页面组件负责组合，展示组件通过 props 接收数据。
- 全局样式只放跨应用共享内容，不放单个组件私有样式。
- 优先使用 Tailwind CSS，复杂黏土阴影和动效可用 scoped CSS 补充。
- 后续接接口时，应通过统一 API client 获取数据，不在组件里直接拼 URL。

## 验证方式

```bash
pnpm --filter @bookkeeping/admin-web typecheck
pnpm --filter @bookkeeping/admin-web build
```
