# 开发规则

## 文档规则

- 每个功能必须有简体中文文档。
- 文档不是收尾项，而是功能定义的一部分。
- 功能文档至少包含：功能目标、业务规则、数据模型、接口说明、权限规则、异常情况、测试与验证方式、后续扩展点。
- 代码命名、接口字段、数据库字段使用英文。
- 文档、交接说明和产品说明使用简体中文。
- 每轮有实质变更完成前，必须检查 `AGENTS.md`、当前子项目 `AGENTS.md`、`.codex/project-context.md`、`docs/handover/开发交接说明.md` 和相关模块文档是否需要同步当前状态、下一轮建议、验证命令或边界规则。
- 新对话启动优先使用 `.codex/checklists/startup.md`，收尾优先使用 `.codex/checklists/handoff.md`，避免每轮重复粘贴长提示词。
- 如果上下文需要同步，应和功能变更一起提交；如果无需同步，应在最终回复中说明已检查。

## 架构规则

- 前端只调用 NestJS API，不直接调用 FastAPI。
- NestJS 负责认证、权限、业务编排和数据一致性。
- FastAPI 负责 AI 能力，不承担主业务状态。
- AI 服务只返回候选结果，不直接创建正式交易流水。
- 账本协作权限统一通过 Policy 层实现。
- 不要把权限判断散落在 Controller 或前端页面中。

## 前端规则

- Vue 代码默认使用 Vue 3、Composition API、`<script setup lang="ts">`。
- 后台 Web 使用 Vue 3 + TypeScript + Vite。
- 用户多端使用 uni-app + Vue 3 + TypeScript。
- 视觉设计优先遵循根目录 `designer.md`。
- 设计 token 必须集中维护，避免一次性颜色、阴影、圆角和字体。
- 组件应优先抽象为可复用基础组件。

## 后端规则

- NestJS 采用模块化单体。
- 修改 NestJS 代码前优先使用 `nestjs-best-practices`，但不得覆盖本项目 Controller、Service、Policy 和 Prisma 分层规则。
- Controller 只负责 HTTP 入参和响应。
- Service 负责业务流程。
- Prisma 层负责数据访问。
- 金额使用 Decimal，不使用 float。
- 时间统一存 UTC，账本保存 timezone。
- 重要删除优先软删除。
- 敏感操作写入审计日志。
- 修改 FastAPI AI 服务前优先使用 `fastapi`，但 FastAPI 仍只能作为 internal-only 服务返回候选结果，不承担认证、权限、正式流水创建或主业务状态。

## 提交规则

- 每个可验证的小步骤尽量独立提交。
- 提交信息使用英文 Conventional Commits。
- 示例：`docs: add project agent guidelines`、`feat: add ledger module skeleton`。
- 提交前必须完成上下文同步检查，避免新对话读到过期状态。
- 推荐安装仓库 hooks：`pnpm hooks:install`。当前 pre-commit 只运行轻量空白检查，完整验证仍按改动范围运行 `pnpm verify:*`。

## 脚手架协作规则

- Agent 不直接执行项目创建脚手架命令。
- Agent 给出明确命令，由用户在终端执行。
- 用户执行完成后，Agent 再统一修改配置、目录结构、代码规范和文档模板。
