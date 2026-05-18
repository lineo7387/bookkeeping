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

## 当前工程状态

- 已初始化 pnpm workspace。
- `apps/api` 已完成 M1 和 M1.5：认证、会话、用户资料、账本、成员角色、Ledger Policy、账户、分类、流水基础闭环和对应单元测试。
- `apps/admin-web` 已创建 Vue 3 后台首页，当前使用静态数据，尚未接入真实 API。
- `packages/shared-types` 已补充账户、分类、流水摘要类型和交易来源类型。
- `packages/api-client` 已创建面向 NestJS 对外 API 的轻量请求客户端。
- `apps/ai-service`、`apps/mobile`、`packages/validation`、`packages/config` 尚未创建代码脚手架。

## 新对话建议

如果在新对话继续开发，优先使用 Superpowers 的 `subagent-driven-development` 模式，并先检查：

```bash
git status --short --branch
git log --oneline -8
```

当前分支 `codex/m15-accounts-categories-transactions` 已完成 M1.5 并通过验证；优先方向是 review/合并 M1.5，随后继续 M2 的账户余额流水联动、基础统计、AI 编排或后续脚手架。
