# Bookkeeping 后台 Web

后台 Web 使用 Vue 3、TypeScript、Vite 和 Tailwind CSS 构建，服务于用户、账本、AI 任务、审计日志等运营管理场景。

## 本地开发

```bash
pnpm --filter @bookkeeping/admin-web dev
```

## 验证

```bash
pnpm --filter @bookkeeping/admin-web typecheck
pnpm --filter @bookkeeping/admin-web build
```

## 目录约定

- 页面放在 `src/views`。
- 可复用组件放在 `src/components`。
- 全局设计 token、字体、基础 reset 和动画放在 `src/style.css`。
- 组件独有样式写在对应 `.vue` 文件的 `<style scoped>` 中。
- 页面和组件布局优先使用 Tailwind CSS。
- 视觉系统以仓库根目录 `designer.md` 为准。
