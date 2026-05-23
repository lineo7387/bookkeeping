# Agent 协作说明

## 项目定位

本项目是面向个人与家庭共享场景的智能记账平台。第一阶段目标是完成个人/家庭账本、成员权限、基础记账、私密流水、基础统计、AI 文本记账和票据识别的可落地 MVP。

详细设计以以下文件为准：

- `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`：产品、架构、数据库、权限、接口和迭代设计。
- `designer.md`：前端视觉设计系统。
- `.agents/project-context.md`：AI/Agent 快速上下文。
- `.agents/development-rules.md`：开发和文档规则。
- `.agents/skills.md`：跨工具 skills 使用说明和降级规则。
- `.agents/skills/`：当前项目推荐 skills 的仓库级副本。
- `.agents/checklists/startup.md`、`.agents/checklists/handoff.md`：新对话启动和收尾短清单。
- `docs/modules/agent-context/Agent协作上下文说明.md`：monorepo 分层 Agent 上下文维护规则。

## 全局硬规则

- 本项目采用 pnpm workspace monorepo；具体应用和 package 的技术栈、目录结构和最佳实践以对应子目录 `AGENTS.md` 为准。
- 每个功能必须有简体中文文档，文档是交付内容的一部分。
- 代码命名、接口字段、数据库字段使用英文。
- 产品说明、模块说明、交接说明使用简体中文。
- 项目脚手架创建命令由用户执行；Agent 只给出命令提示，创建后再修改配置和文档。
- 前端只能调用 NestJS 对外 API，不直接调用 FastAPI。
- FastAPI 当前只生成 AI 候选结果；后续 M6 如扩展为财务问答，也只能基于 NestJS 提供的受控工具结果生成答复，不承担认证、权限、主业务状态、正式流水创建或直接数据库访问。
- AI 候选结果必须由用户确认后，才允许由 NestJS 创建正式流水。
- 所有交易归属于 `ledger`，不要直接建模为只归属于 `user`。
- 所有协作权限通过 `ledger_members` 和 Policy 层判断。
- 前端视觉实现必须优先遵循根目录 `designer.md`。
- monorepo 子项目可以维护自己的 `AGENTS.md`，但只能补充局部规则，不能覆盖根目录硬规则。
- 子项目 `AGENTS.md` 应保持短、准、局部化，避免重复整段根目录说明。
- 推荐 Agent skills 由当前工作目录最近的 `AGENTS.md` 说明；根目录只保留全局协作边界。
- 当前项目推荐 skills 已固定安装到 `.agents/skills/`；不要为了本项目修改个人全局 skills。
- `.agents/` 是跨工具共享规则源；`.codex/`、`CLAUDE.md`、`GEMINI.md` 和 `.cursor/rules/` 只做工具适配入口，不维护独立规则。

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
4. `.agents/development-rules.md`
5. `.agents/skills.md`
6. 对应功能的中文模块文档

如果对应功能文档不存在，应先创建文档，再实现代码。

## 收尾上下文同步

每轮完成有实质影响的代码、接口、文档或状态变更后，在最终回复或提交前必须检查是否需要同步以下上下文：

1. 根目录 `AGENTS.md` 的当前工程状态和新对话建议。
2. 当前工作目录最近的子项目 `AGENTS.md`。
3. `.agents/project-context.md`。
4. `.agents/development-rules.md`。
5. `.agents/skills.md`。
6. `docs/handover/开发交接说明.md` 和相关模块中文文档。

如果本轮变更改变了里程碑状态、模块边界、验证命令、禁止事项、下一轮建议或可用接口，应同步更新上述文件中的对应内容。修改上下文后至少运行 `git diff --check`，并将上下文同步作为本地提交的一部分。

## 当前工程状态

- 已初始化 pnpm workspace。
- `apps/api` 已完成 M1、M1.5、M2 账户余额流水联动，M3 基础统计 API、审计日志基础写入与业务接入能力和后台只读 Admin API 基础能力，以及 M4 AI 文本记账 NestJS 闭环首版和后续加固，以及 M5 票据 OCR 与文件：数据库新增 `TransactionAttachment` 模型，全局 `QueueModule`（BullMQ）和 `StorageModule`（MinIO S3）支持；Worker 处理器异步调度 FastAPI `/internal/ai/receipt-ocr` 处理流程，支持低置信度要素警告，并在流水确认事务中自动关联附件。
- `apps/admin-web` 已创建 Vue 3 后台登录页、后台首页和独立 AI 任务列表页，并已通过 `@bookkeeping/api-client` 接入 NestJS 登录接口和 M3/M4 后台只读 Admin API；系统管理员登录后 access token 写入 Pinia 持久化会话，首页展示用户、账本、真实 AI 任务摘要和审计日志首屏分页样本，AI 任务队列和独立列表页支持状态/类型筛选；本地 Vite dev server 已配置 `/api` 代理到 `http://127.0.0.1:3000`。
- `packages/shared-types` 已补充账户、分类、流水摘要、交易来源、基础统计、认证响应、AI 任务、AI 候选、低置信度候选补全字段、后台只读响应类型以及 ReceiptOcrAcceptedResult / TransactionAttachmentSummary 类型。
- `packages/api-client` 已创建面向 NestJS 对外 API 的轻量请求客户端，当前封装登录、AI 文本解析、AI 任务查询、候选确认/拒绝、Admin 只读列表入口以及 M5 `receiptOcr` 票据文件 Multipart 上传和请求客户端支持。
- `apps/ai-service` 已用 `uv` 创建 FastAPI 内部服务，提供 M4 文本记账确定性 MVP parser 以及 M5 票据 Tesseract OCR 解析与服务；金额可识别但分类/账户不明确时会返回低置信度候选和 `missingFields` / `reviewMessage`。M4 和 M5 本地运行、NestJS-to-FastAPI 联调和故障排查示例已补充到中文模块文档。`apps/mobile`、`packages/validation`、`packages/config` 尚未创建代码脚手架。
- 已迁移 `.agents/` 为跨工具共享规则源，并保留 `.codex/`、`CLAUDE.md`、`GEMINI.md` 和 `.cursor/rules/` 作为适配入口；当前推荐 skills 已安装到 `.agents/skills/`，`.agents/skills.md` 记录调用时机和跨工具降级规则；`.agents/checklists/startup.md` 和 `.agents/checklists/handoff.md` 用于减少新对话重复粘贴上下文。根目录已提供 `verify:*` 脚本、`e2e:m4:ai-text` 本地闭环联调脚本、`e2e:m5:receipt-ocr` 本地 OCR 联调脚本和轻量 `.githooks/pre-commit`，`apps/api` 已提供本地系统管理员 `admin:bootstrap` 脚本。

## 新对话建议

如果在新对话继续开发，先检查：

```bash
git status --short --branch
git log --oneline -8
```

当前 `main` 已合并 M4 AI 文本记账 NestJS 闭环首版、FastAPI 确定性 MVP parser、低置信度候选补全提示、独立 Admin AI 任务列表页和本地 `pnpm e2e:m4:ai-text` 闭环脚本；本地启动验证已修复 Prisma 7 adapter 和 AI 内部 client provider wiring 问题。后台 Web 已补系统管理员登录页和 Pinia access token 会话入口；本地管理员可用 `pnpm --filter @bookkeeping/api admin:bootstrap -- --email <email> --password <password>` 创建或提权。继续开发时可先按 `.agents/checklists/startup.md` 启动；M5 是票据 OCR 与文件，M6 规划为 AI 财务问答与洞察。开始新功能前应先补或读取对应中文模块文档，不要做移动端页面，也不要让前端或 `api-client` 直接调用 FastAPI。
