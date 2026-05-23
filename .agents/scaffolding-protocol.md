# 脚手架创建协作协议

## 原则

项目创建阶段采用“用户执行脚手架，Agent 修改配置”的方式。

Agent 可以：

- 给出创建命令。
- 解释命令目的。
- 检查创建结果。
- 修改配置文件。
- 补充目录结构。
- 添加中文文档模板。
- 调整 monorepo、lint、format、env、Prisma、Docker 等配置。

Agent 不应：

- 未经用户执行步骤，直接运行创建框架的脚手架命令。
- 在用户未确认时一次性创建所有应用。
- 把框架初始化和业务功能实现混在一个步骤中。

## 推荐创建顺序

已完成：

- 根目录 pnpm workspace 已初始化。
- `apps/api` 已创建，当前为 NestJS 11 + Prisma 7。
- `apps/admin-web` 已创建，当前为 Vue 3 + TypeScript + Vite + Tailwind CSS。
- `apps/ai-service` 已创建，当前为 uv 管理的 FastAPI 内部 AI 服务。
- `packages/shared-types` 已创建，当前提供跨端共享类型和 AI 候选结果基础类型。
- `packages/api-client` 已创建，当前只封装前端访问 NestJS API 的请求能力。

剩余应用脚手架：

第一步：确认当前分支和远端推送策略。Agent 不应在用户未批准时执行 push，只能提示用户确认后再操作。

```bash
git status --short --branch
git log --oneline -8
git remote -v
```

第二步：创建 uni-app 移动端。命令由用户执行；Agent 在用户执行后检查并补配置。

```bash
# uni-app 创建命令需根据用户选择的 HBuilderX/CLI 方案确认后再执行
# 目标目录：apps/mobile
# 技术方向：uni-app + Vue 3 + TypeScript
```

第三步：后续再评估共享配置包和校验包。

```bash
# packages/validation 与 packages/config 暂不在 M0 强行创建
# 等多个端出现重复校验或重复配置后再拆分
```

## 每次创建后的检查

用户执行脚手架后，Agent 应检查：

- 目录是否在预期位置。
- package 名称是否符合 monorepo 规范。
- TypeScript 配置是否可被统一管理。
- lint、format、test 命令是否可统一调用。
- 是否需要删除模板示例代码。
- 是否需要补中文 README 或模块说明。

## 边界提醒

- 前端应用、后台 Web 和移动端只能调用 NestJS 对外 API，不能直接调用 FastAPI。
- FastAPI AI 服务只返回候选结果，不创建正式流水。
- AI 候选结果必须由 NestJS 保存，用户确认后才创建正式 `transaction`。
- `@bookkeeping/api-client` 只能封装 NestJS API，不能暴露 FastAPI 内部地址。
- 后续详细步骤见 `docs/handover/后续脚手架计划.md`。
