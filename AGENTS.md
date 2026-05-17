# Agent 协作说明

## 项目定位

本项目是面向个人与家庭共享场景的智能记账平台。第一阶段目标是完成个人/家庭账本、成员权限、基础记账、私密流水、基础统计、AI 文本记账和票据识别的可落地 MVP。

详细设计以以下文件为准：

- `designer.md`：前端视觉设计系统。
- `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`：产品、架构、数据库、权限、接口和迭代设计。
- `.codex/project-context.md`：AI/Agent 快速上下文。
- `.codex/development-rules.md`：开发和文档规则。

## 技术方向

- Monorepo：pnpm workspace。
- 后端：NestJS 模块化单体。
- AI 服务：FastAPI 独立服务。
- 数据库：PostgreSQL。
- 缓存和队列：Redis + BullMQ。
- 后台 Web：Vue 3 + TypeScript + Vite。
- 后台 Web 样式：Tailwind CSS 优先，组件私有样式使用 Vue SFC scoped style。
- 用户多端：uni-app + Vue 3 + TypeScript。
- ORM：Prisma。

## 当前工程状态

- 已初始化 pnpm workspace。
- 已创建 `apps/api`：NestJS 11、Prisma 7、`@nestjs/config`、`.env.example`。
- 已创建 `apps/admin-web`：Vue 3、TypeScript、Vite、Tailwind CSS、lucide-vue-next。
- 后台首页位于 `apps/admin-web/src/views/DashboardView.vue`。
- 后台 Web 当前使用静态数据，尚未接入真实 API。
- 尚未创建 `apps/ai-service`、`apps/mobile`、`packages/shared-types`、`packages/api-client`。

## 协作规则

- 每个功能必须有简体中文文档。
- 代码命名、接口字段、数据库字段使用英文。
- 产品说明、模块说明、交接说明使用简体中文。
- 项目脚手架创建命令由用户执行；Agent 只给出命令提示，创建后再修改配置。
- 不要绕过 NestJS 让前端直接调用 FastAPI。
- AI 服务只生成候选结果，用户确认后才创建正式流水。
- 所有交易归属于 `ledger`，不要直接建模为只归属于 `user`。
- 所有协作权限通过 `ledger_members` 和 Policy 层判断。
- 前端视觉实现必须优先遵循根目录 `designer.md`。
- 后台 Web 采用克制版 Soft Clay Admin：保留圆润、柔和阴影和品牌色，但降低装饰密度，优先保证信息扫描效率。
- 页面文件必须放在 `views` 目录。
- 全局样式只放 token、字体、reset、动画等跨应用内容。
- 组件独有样式写在对应 `.vue` 文件的 `<style scoped>` 中。
- 前端布局和常规样式优先使用 Tailwind CSS。
- 不要把后台侧边栏、表格、列表等信息密集区域做成过度黏土化或展示页风格。

## 修改前检查

开始任何实现前，应先阅读：

1. `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`
2. `designer.md`
3. `.codex/development-rules.md`
4. 对应功能的中文模块文档

如果对应功能文档不存在，应先创建文档，再实现代码。

## 新对话建议

如果在新对话继续开发，优先使用 Superpowers 的 `subagent-driven-development` 模式，并先检查：

```bash
git status --short --branch
git log --oneline -8
```

当前优先方向是继续完成 M0：AI 服务规范化、共享包、API client、后续脚手架计划，以及是否推送 `main` 到远端。
