# Agent 协作说明

## 项目定位

本项目是面向个人与家庭共享场景的智能记账平台。第一阶段目标是完成个人/家庭账本、成员权限、基础记账、私密流水、基础统计、AI 文本记账和票据识别的可落地 MVP。

详细设计以以下文件为准：

- `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`：产品、架构、数据库、权限、接口和迭代设计。
- `designer.md`：前端视觉设计系统。
- `.codex/project-context.md`：AI/Agent 快速上下文。
- `.codex/development-rules.md`：开发和文档规则。
- `docs/modules/agent-context/Agent协作上下文说明.md`：monorepo 分层 Agent 上下文维护规则。

## 全局硬规则

- 本项目采用 pnpm workspace monorepo；具体应用和 package 的技术栈、目录结构和最佳实践以对应子目录 `AGENTS.md` 为准。
- 每个功能必须有简体中文文档，文档是交付内容的一部分。
- 代码命名、接口字段、数据库字段使用英文。
- 产品说明、模块说明、交接说明使用简体中文。
- 项目脚手架创建命令由用户执行；Agent 只给出命令提示，创建后再修改配置和文档。
- 前端只能调用 NestJS 对外 API，不直接调用 FastAPI。
- FastAPI 只生成 AI 候选结果，不承担认证、权限、主业务状态或正式流水创建。
- AI 候选结果必须由用户确认后，才允许由 NestJS 创建正式流水。
- 所有交易归属于 `ledger`，不要直接建模为只归属于 `user`。
- 所有协作权限通过 `ledger_members` 和 Policy 层判断。
- 前端视觉实现必须优先遵循根目录 `designer.md`。
- monorepo 子项目可以维护自己的 `AGENTS.md`，但只能补充局部规则，不能覆盖根目录硬规则。
- 子项目 `AGENTS.md` 应保持短、准、局部化，避免重复整段根目录说明。
- 推荐 Agent skills 由当前工作目录最近的 `AGENTS.md` 说明；根目录只保留全局协作边界。

## 分层 Agent 上下文

当前和规划中的局部上下文：

- `apps/api/AGENTS.md`：NestJS 主业务服务规则。
- `apps/admin-web/AGENTS.md`：Vue 后台管理端规则。
- `apps/ai-service/AGENTS.md`：FastAPI AI 服务规则。
- `apps/mobile/AGENTS.md`：uni-app 用户多端规则。
- `packages/shared-types/AGENTS.md`：共享类型包规则。
- `packages/api-client/AGENTS.md`：NestJS API 请求客户端规则。
- `packages/validation/AGENTS.md`：共享校验包规则。
- `packages/config/AGENTS.md`：共享工程配置包规则。

未创建代码脚手架的目录只能维护协作说明，不应提前添加业务代码、package.json 或框架配置。

## 修改前检查

开始任何实现前，应先阅读：

1. 根目录 `AGENTS.md`
2. 当前工作目录最近的 `AGENTS.md`
3. `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`
4. `.codex/development-rules.md`
5. 对应功能的中文模块文档

如果对应功能文档不存在，应先创建文档，再实现代码。

## 收尾上下文同步

每轮完成有实质影响的代码、接口、文档或状态变更后，在最终回复或提交前必须检查是否需要同步以下上下文：

1. 根目录 `AGENTS.md` 的当前工程状态和新对话建议。
2. 当前工作目录最近的子项目 `AGENTS.md`。
3. `.codex/project-context.md`。
4. `.codex/development-rules.md`。
5. `docs/handover/开发交接说明.md` 和相关模块中文文档。

如果本轮变更改变了里程碑状态、模块边界、验证命令、禁止事项、下一轮建议或可用接口，应同步更新上述文件中的对应内容。修改上下文后至少运行 `git diff --check`，并将上下文同步作为本地提交的一部分。

## 当前工程状态

- 已初始化 pnpm workspace。
- `apps/api` 已完成 M1、M1.5、M2 账户余额流水联动，M3 基础统计 API、审计日志基础写入与业务接入能力和后台只读 Admin API 基础能力，以及 M4 AI 文本记账 NestJS 闭环首版和后续加固：认证、会话、用户资料、账本、成员角色、Ledger Policy、账户、分类、流水基础闭环、正式流水联动账户余额、月度收支、分类占比、账户余额统计、成员消费统计、`audit_logs` Prisma 模型、`AuditLogsModule`、账本/成员/账户/分类/流水写操作审计、`users.is_system_admin`、`SystemAdminGuard`、只读 Admin API、`ai_tasks`、`ai_extractions`、`AiModule`、文本解析任务、候选保存、确认/拒绝、内部 FastAPI 调用超时与响应校验、AI 确认事务内审计写入、`/admin/ai/tasks` 状态/类型筛选、Prisma 7 PostgreSQL adapter 启动修复和应用模块 provider wiring 测试。
- `apps/admin-web` 已创建 Vue 3 后台首页，并已通过 `@bookkeeping/api-client` 接入 M3/M4 后台只读 Admin API，展示用户、账本、真实 AI 任务摘要和审计日志首屏分页样本；本地 Vite dev server 已配置 `/api` 代理到 `http://127.0.0.1:3000`。
- `packages/shared-types` 已补充账户、分类、流水摘要、交易来源、基础统计、AI 任务、AI 候选和后台只读响应类型。
- `packages/api-client` 已创建面向 NestJS 对外 API 的轻量请求客户端，当前封装 AI 文本解析、AI 任务查询、候选确认/拒绝和 Admin 只读列表入口；AI 候选确认可见性已收窄为 `ledger | private`，Admin AI 任务列表支持 `status` / `type` 筛选参数。
- `apps/ai-service` 已用 `uv` 创建 FastAPI 内部服务，并已提供 M4 文本记账确定性 MVP parser；当前文本候选只产出 `income | expense`，不进入 transfer 和 M5 票据 OCR。M4 本地运行、NestJS-to-FastAPI 联调和故障排查示例已补充到中文模块文档。`apps/mobile`、`packages/validation`、`packages/config` 尚未创建代码脚手架。

## 新对话建议

如果在新对话继续开发，先检查：

```bash
git status --short --branch
git log --oneline -8
```

当前分支 `codex/m4-ai-text-accounting` 已完成 M4 AI 文本记账 NestJS 闭环首版、FastAPI 确定性 MVP parser、后续加固提交 `baa7470 fix: harden m4 ai text follow-up`，并已补充 M4 本地运行、NestJS-to-FastAPI 联调和故障排查文档；本地启动验证已修复 Prisma 7 adapter 和 AI 内部 client provider wiring 问题。继续开发时优先做真实端到端联调脚本/集成测试、低置信度候选补全语义或 Admin AI 任务筛选展示增强；不要跳到 M5 票据 OCR，不要做移动端页面，也不要让前端或 `api-client` 直接调用 FastAPI。开始新功能前应先补或读取对应中文模块文档。
