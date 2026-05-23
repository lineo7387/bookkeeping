# Agent 协作上下文说明

## 功能目标

Agent 协作上下文用于让 AI 在 monorepo 中快速识别项目边界、技术栈、开发规则、目录约定和推荐技能，减少跨应用规则混淆，提高生成代码和文档时的一致性。

本项目采用根目录总则加子项目局部规则的方式维护 `AGENTS.md`：

- 根目录 `AGENTS.md`：项目定位、全局硬规则、修改前检查、局部上下文索引和当前工程状态。
- `.agents/`：跨工具共享规则源，保存项目上下文、开发规则、skills 映射、清单和提示词模板。
- `.agents/skills/`：当前项目推荐 Agent skills 的仓库级副本，避免依赖个人全局安装。
- `.codex/`、`CLAUDE.md`、`GEMINI.md`、`.cursor/rules/`：工具适配入口，只引用 `.agents/`，不维护独立规则。
- `apps/*/AGENTS.md`：具体应用的技术栈最佳实践、推荐 Agent skills、目录架构、验证命令和禁止事项。
- `packages/*/AGENTS.md`：共享包的职责边界、技术栈最佳实践、推荐 Agent skills、目录架构和调用约束。

## 维护原则

- 根目录只写跨项目都必须遵守的规则，不重复子项目已有的框架细节。
- 子项目 `AGENTS.md` 只补充和细化本目录规则，不能覆盖根目录硬规则。
- 子项目规则应包含：模块定位、修改前检查、推荐 Agent skills、技术栈最佳实践、推荐目录架构、验证命令和禁止事项。
- 新增业务功能前仍需先检查对应中文模块文档；缺少模块文档时，应先补文档再实现。
- 未创建代码脚手架的规划目录可以先维护 `AGENTS.md`，但不得提前创建业务代码、package.json 或框架配置。
- 完成任一里程碑、功能闭环、接口契约变化、验证命令变化、skills 映射变化或下一轮建议变化后，必须同步检查根 `AGENTS.md`、最近子项目 `AGENTS.md`、`.agents/project-context.md`、`.agents/skills.md`、`docs/handover/开发交接说明.md` 和相关模块文档。
- 如果检查后确认无需更新上下文，应在最终交付说明中明确“已检查上下文，无需同步”。

## 当前上下文文件

已维护的应用上下文：

- `apps/api/AGENTS.md`：NestJS 主业务服务。
- `apps/admin-web/AGENTS.md`：Vue 后台管理端。
- `apps/ai-service/AGENTS.md`：已创建的 FastAPI AI 服务，当前提供 M4 文本记账 deterministic parser。
- `apps/mobile/AGENTS.md`：规划中的 uni-app 用户多端。

已维护的共享包上下文：

- `packages/shared-types/AGENTS.md`：共享类型包。
- `packages/api-client/AGENTS.md`：NestJS API 请求客户端。
- `packages/validation/AGENTS.md`：规划中的共享校验包。
- `packages/config/AGENTS.md`：规划中的共享工程配置包。

已维护的跨工具适配入口：

- `.agents/README.md`：共享规则源索引。
- `.agents/skills.md`：skills 使用说明和跨工具降级规则。
- `.agents/skills/`：仓库级 skills 实际内容。
- `.codex/README.md`：Codex 兼容入口。
- `CLAUDE.md`：Claude 兼容入口。
- `GEMINI.md`：Gemini 兼容入口。
- `.cursor/rules/bookkeeping-agent-rules.md`：Cursor 兼容入口。

## 业务规则

- 前端、移动端和 `api-client` 只能调用 NestJS API，不得直接调用 FastAPI。
- AI 相关能力必须经过 NestJS 编排；FastAPI 只返回候选结果。
- 用户确认 AI 候选结果后，才允许由 NestJS 创建正式流水。
- 所有交易归属于 `ledger`；所有协作权限通过 `ledger_members` 和 Policy 层判断。
- 框架技能只能补充最佳实践，不能覆盖项目硬规则。

## 数据模型

本模块不新增数据库模型。

## 接口说明

本模块不新增对外接口。它只定义开发协作上下文文件的组织方式。

## 权限规则

本模块不新增运行时权限。涉及账本、成员、账户、分类、流水等业务开发时，仍以 `ledger_members` 和后端 Policy 层为准。

## 异常情况

- 如果根目录和子目录规则冲突，优先遵守根目录硬规则，并修正子目录描述。
- 如果子项目规则与中文模块文档冲突，先检查最近提交和实际代码，再更新过期文档。
- 如果某个包只是构建产物或临时目录，不应新增 `AGENTS.md`，避免污染上下文。
- 如果未来新增 workspace package，应先判断它是否有独立开发规则；没有独立规则时不必强行增加上下文文件。

## 测试与验证方式

修改 Agent 协作上下文后至少运行：

```bash
git diff --check
```

如果同步修改了代码、配置或 package 脚本，应额外运行对应项目的 typecheck、test 或 build 命令。

## 后续扩展点

- `apps/ai-service` 当前使用 `uv` 管理，验证命令为 `cd apps/ai-service && uv run pytest`；本地开发可使用 `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`。
- `apps/mobile` 脚手架创建后，按实际 uni-app package scripts 补充验证命令。
- `packages/validation` 创建后，补充共享校验选型和测试策略。
- `packages/config` 创建后，补充共享 tsconfig、lint、format 的导出方式。
- 里程碑完成后，及时同步根目录和相关子项目的当前工程状态。
