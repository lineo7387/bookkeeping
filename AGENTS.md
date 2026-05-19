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
- `apps/api` 已完成 M1、M1.5、M2 账户余额流水联动，以及 M3 基础统计 API、审计日志基础写入能力和后台只读 Admin API 基础能力：认证、会话、用户资料、账本、成员角色、Ledger Policy、账户、分类、流水基础闭环、正式流水联动账户余额、月度收支、分类占比、账户余额统计、成员消费统计、`audit_logs` Prisma 模型、`AuditLogsModule`、`users.is_system_admin`、`SystemAdminGuard`、只读 Admin API、Repository、Service 和对应单元测试。
- `apps/admin-web` 已创建 Vue 3 后台首页，当前使用静态数据，尚未接入真实 API。
- `packages/shared-types` 已补充账户、分类、流水摘要、交易来源和基础统计响应类型。
- `packages/api-client` 已创建面向 NestJS 对外 API 的轻量请求客户端。
- `apps/ai-service`、`apps/mobile`、`packages/validation`、`packages/config` 尚未创建代码脚手架。

## 新对话建议

如果在新对话继续开发，先检查：

```bash
git status --short --branch
git log --oneline -8
```

`main` 已完成 M2 账户余额流水联动、M3 基础统计 API、M3 审计日志基础写入能力，并已提交 M3 后续计划 `docs/superpowers/plans/2026-05-19-m3-statistics-admin-audit.md`。当前工作区继续完成了后台只读 Admin API 基础能力：`users.is_system_admin`、`SystemAdminGuard`、用户列表、账本列表、AI 任务占位列表和审计日志查询。审计日志尚未接入具体业务敏感操作，后台 Web 尚未接入真实 API。严格按路线继续时，下一步应继续 M3 审计日志业务接入；AI 文本记账属于 M4，暂不提前实现。开始新功能前应先补或读取对应中文模块文档。
