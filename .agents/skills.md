# Agent Skills 使用说明

## 定位

本文件记录项目推荐的 Agent skills、仓库级安装位置和跨工具降级规则。

项目已将当前推荐使用的 skills 固定安装到仓库目录 `.agents/skills/`。支持仓库级 skills 的工具应优先加载 `.agents/skills/<skill-name>/SKILL.md`；如果工具只支持个人级或插件级 skills，可以继续使用工具原生机制，但不得修改全局 skills 作为项目交付。`browser:browser` 属于 Codex Browser 插件能力，仍通过插件提供。

不支持 skills 的工具应把本文件、`.agents/skills/<skill-name>/SKILL.md` 和最近的子项目 `AGENTS.md` 当作最佳实践清单阅读。

## 通用流程技能

- `using-superpowers`：新会话开始时用于确认可用 skills 和调用规则。
- `brainstorming`：新增功能、修改行为、设计页面或制定方案前使用。
- `writing-plans`：需求明确且涉及多步实施时使用。
- `executing-plans`：按已写好的实现计划在当前会话分批执行时使用。
- `subagent-driven-development`：执行包含独立任务的实现计划时使用。
- `using-git-worktrees`：需要隔离工作区再开始较大功能时使用。
- `dispatching-parallel-agents`：存在多个互不依赖任务且可并行推进时使用。
- `test-driven-development`：新增业务规则、解析规则、校验逻辑或可测试状态转换前使用。
- `systematic-debugging`：修复失败测试、构建错误、权限穿透、金额误差、时区和布局异常前使用。
- `receiving-code-review`：收到代码审查意见并准备处理前使用。
- `verification-before-completion`：声明完成、提交或交付前使用。
- `requesting-code-review`：完成跨模块能力、权限敏感改动或较大功能后使用。
- `finishing-a-development-branch`：开发分支已验证通过并准备合并、提 PR 或清理时使用。
- `writing-skills`：新增、修改或验证仓库级 skills 时使用。

## 子项目推荐技能

- `apps/api`：`nestjs-best-practices`、`test-driven-development`、`systematic-debugging`、`requesting-code-review`、`verification-before-completion`。
- `apps/ai-service`：`fastapi`、`test-driven-development`、`systematic-debugging`、`verification-before-completion`。
- `apps/admin-web`：`vue-best-practices`、`frontend-design`、`browser:browser`、`test-driven-development`、`systematic-debugging`、`verification-before-completion`。
- `apps/mobile`：`vue-best-practices`、`frontend-design`、`test-driven-development`、`systematic-debugging`、`verification-before-completion`。
- `packages/shared-types`、`packages/api-client`、`packages/validation`：`test-driven-development`、`systematic-debugging`、`verification-before-completion`。
- `packages/config`：`systematic-debugging`、`verification-before-completion`。

## 跨工具说明

- Codex：优先读取 `AGENTS.md` 和 `.codex/` 适配入口；仓库级 skills 放在 `.agents/skills/`，当前会话可直接按 `.agents/skills/<skill-name>/SKILL.md` 读取并执行。
- Claude Code：优先通过工具原生的 `Skill` 机制读取相关 skill；再读取 `CLAUDE.md`、`AGENTS.md` 和 `.agents/`。
- Gemini CLI：优先通过 `activate_skill` 或等效机制读取相关 skill；再读取 `GEMINI.md`、`AGENTS.md` 和 `.agents/`。
- Cursor 或普通模型工具：读取 `.cursor/rules/bookkeeping-agent-rules.md`、`AGENTS.md` 和 `.agents/`；如果没有真实 skill 调用能力，就把推荐 skills 当作工作方法说明。

## 硬规则

skills 只能补充工作方法，不能覆盖项目规则。项目边界仍以根目录 `AGENTS.md`、`.agents/development-rules.md`、最近的子项目 `AGENTS.md` 和对应中文模块文档为准。
