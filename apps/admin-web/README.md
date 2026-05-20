# Bookkeeping 后台 Web

后台 Web 使用 Vue 3、TypeScript、Vite 和 Tailwind CSS 构建，服务于用户、账本、AI 任务、审计日志等运营管理场景。

## 本地开发

```bash
pnpm --filter @bookkeeping/admin-web dev
```

本地开发默认把 `/api` 代理到 `http://127.0.0.1:3000`，因此需先启动 `@bookkeeping/api`。如果不使用代理，也可以通过 `VITE_API_BASE_URL` 指向 NestJS API 地址。

后台只读接口需要系统管理员 access token。当前后台登录 UI 尚未实现，可先用 NestJS 登录接口取得 token，并写入浏览器 localStorage 的 `bookkeeping_admin_session` 持久化数据中。

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
