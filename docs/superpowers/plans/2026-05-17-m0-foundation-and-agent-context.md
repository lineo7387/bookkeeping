# M0 Foundation And Agent Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the repository foundation, AI/Agent context, Chinese documentation skeleton, and scaffold protocol for the Bookkeeping platform before application code is generated.

**Architecture:** This phase does not implement business features. It creates the monorepo rules, Codex/Agent context, documentation structure, and step-by-step scaffold handoff so later NestJS, FastAPI, Vue, and uni-app work can proceed consistently.

**Tech Stack:** pnpm workspace, NestJS, FastAPI, Vue 3, uni-app, PostgreSQL, Redis, Prisma, Markdown documentation.

---

## File Structure

Files created or maintained by this plan:

- Create: `AGENTS.md`  
  Root AI/Agent entrypoint that explains project context, required reading, and collaboration rules.
- Create: `.codex/README.md`  
  Index for Codex-specific context files.
- Create: `.codex/project-context.md`  
  Compact project overview for AI collaborators.
- Create: `.codex/development-rules.md`  
  Development, documentation, frontend, backend, and commit rules.
- Create: `.codex/scaffolding-protocol.md`  
  User-executes-scaffold, Codex-configures-afterward protocol.
- Create: `.codex/ai-service-guidelines.md`  
  AI service boundaries, candidate result rules, and privacy requirements.
- Create: `.codex/prompts/README.md`  
  Future prompt template index.
- Create: `docs/product/需求说明.md`  
  Product requirement summary in Chinese.
- Create: `docs/product/迭代路线.md`  
  Milestone roadmap in Chinese.
- Create: `docs/architecture/总体架构.md`  
  System architecture summary in Chinese.
- Create: `docs/architecture/AI服务设计.md`  
  AI service design summary in Chinese.
- Create: `docs/api/接口规范.md`  
  API conventions in Chinese.
- Create: `docs/handover/开发交接说明.md`  
  Handover guide for future developers and agents.
- Modify: `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`  
  Keep as the authoritative design spec.

## Task 1: Verify Existing Design Inputs

**Files:**

- Read: `designer.md`
- Read: `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`

- [ ] **Step 1: Confirm required files exist**

Run:

```bash
test -f designer.md
test -f docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md
```

Expected: both commands exit with code 0.

- [ ] **Step 2: Confirm the spec references the visual design system**

Run:

```bash
rg -n "designer.md|视觉设计系统|High-Fidelity" docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md
```

Expected: output includes references to `designer.md` and `High-Fidelity Claymorphism`.

- [ ] **Step 3: Commit if new changes were made**

Run:

```bash
git status --short
git add designer.md docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md
git commit -m "docs: align product spec with visual design system"
```

Expected: commit succeeds if files changed. If Git says there is nothing to commit, continue.

## Task 2: Create AI/Agent Context

**Files:**

- Create: `AGENTS.md`
- Create: `.codex/README.md`
- Create: `.codex/project-context.md`
- Create: `.codex/development-rules.md`
- Create: `.codex/scaffolding-protocol.md`
- Create: `.codex/ai-service-guidelines.md`
- Create: `.codex/prompts/README.md`

- [ ] **Step 1: Create the Agent entrypoint**

Create `AGENTS.md` with:

```md
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
- 用户多端：uni-app + Vue 3 + TypeScript。
- ORM：Prisma。

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

## 修改前检查

开始任何实现前，应先阅读：

1. `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`
2. `designer.md`
3. `.codex/development-rules.md`
4. 对应功能的中文模块文档

如果对应功能文档不存在，应先创建文档，再实现代码。
```

- [ ] **Step 2: Create Codex context files**

Create the `.codex` files listed in the file structure. Each file must be written in Simplified Chinese and must include the exact project rules from `AGENTS.md`.

- [ ] **Step 3: Verify files exist**

Run:

```bash
test -f AGENTS.md
test -f .codex/README.md
test -f .codex/project-context.md
test -f .codex/development-rules.md
test -f .codex/scaffolding-protocol.md
test -f .codex/ai-service-guidelines.md
test -f .codex/prompts/README.md
```

Expected: all commands exit with code 0.

- [ ] **Step 4: Commit Agent context**

Run:

```bash
git add AGENTS.md .codex
git commit -m "docs: add agent collaboration context"
```

Expected: commit succeeds.

## Task 3: Create Chinese Documentation Skeleton

**Files:**

- Create: `docs/product/需求说明.md`
- Create: `docs/product/迭代路线.md`
- Create: `docs/architecture/总体架构.md`
- Create: `docs/architecture/AI服务设计.md`
- Create: `docs/api/接口规范.md`
- Create: `docs/handover/开发交接说明.md`

- [ ] **Step 1: Create product requirement document**

Create `docs/product/需求说明.md` with:

```md
# 需求说明

## 项目定位

Bookkeeping 是面向个人与家庭共享场景的智能记账平台。

## 第一阶段目标

- 支持个人账本和家庭账本。
- 支持家庭成员协作。
- 支持基础收入、支出、转账记账。
- 支持共享流水和私密流水。
- 支持 AI 文本记账和票据识别。
- 支持基础统计和后台管理。

## 第一阶段不做

- 小商户财务。
- 税务和进销存。
- 复杂资产管理。
- 完整双分录会计系统。
```

- [ ] **Step 2: Create roadmap document**

Create `docs/product/迭代路线.md` with:

```md
# 迭代路线

## M0：项目底座

项目目录、AI/Agent 规范、中文文档、脚手架协作协议、基础工程配置。

## M1：账号与账本

注册登录、用户资料、账本、成员、邀请、角色权限。

## M2：基础记账闭环

账户、分类、收入、支出、转账、共享流水、私密流水。

## M3：统计与后台

月度收支、分类占比、账户统计、成员消费、后台管理、审计日志。

## M4：AI 文本记账

自然语言解析、候选结果、确认生成流水。

## M5：票据 OCR 与文件

图片上传、对象存储、OCR 异步任务、候选结果确认。
```

- [ ] **Step 3: Create architecture documents**

Create `docs/architecture/总体架构.md` with:

```md
# 总体架构

## 架构选择

项目采用 pnpm monorepo、NestJS 模块化单体、FastAPI 独立 AI 服务、Vue 后台和 uni-app 用户端。

## 服务边界

- NestJS：认证、权限、主业务、数据一致性、对外 API。
- FastAPI：文本记账、票据识别、自动分类、消费分析。
- PostgreSQL：主业务数据。
- Redis：缓存、验证码、队列。
- 对象存储：票据图片和附件。

## 调用关系

前端只调用 NestJS。NestJS 内部调用 FastAPI。FastAPI 不直接暴露给用户端。
```

Create `docs/architecture/AI服务设计.md` with:

```md
# AI 服务设计

## 服务定位

AI 服务只返回候选结果，不直接写入正式交易流水。

## 标准流程

1. 用户输入文本或上传票据。
2. NestJS 校验账本权限。
3. NestJS 创建 `ai_task`。
4. FastAPI 返回结构化候选结果。
5. NestJS 保存 `ai_extraction`。
6. 用户确认。
7. NestJS 创建 `transaction`。

## 隐私要求

- 只发送完成当前任务所需的最小上下文。
- 日志不能输出手机号、邮箱、token、API Key 或完整票据 URL。
- 用户拒绝的候选结果保留状态，便于排查和优化。
```

- [ ] **Step 4: Create API and handover documents**

Create `docs/api/接口规范.md` with:

```md
# 接口规范

## 基本原则

- 所有前端只调用 NestJS API。
- API 字段使用英文。
- 错误信息面向用户时使用中文。
- 分页、错误、权限信息保持统一结构。

## 响应结构

```ts
type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
```
```

Create `docs/handover/开发交接说明.md` with:

```md
# 开发交接说明

## 新成员必读

1. `AGENTS.md`
2. `designer.md`
3. `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`
4. `.codex/project-context.md`
5. `.codex/development-rules.md`

## 开发前要求

- 先查看对应功能中文文档。
- 没有功能文档时，先补文档再写代码。
- 涉及前端页面时，先查看 `designer.md`。
- 涉及 AI 能力时，先查看 `.codex/ai-service-guidelines.md`。
```

- [ ] **Step 5: Verify documentation files**

Run:

```bash
test -f docs/product/需求说明.md
test -f docs/product/迭代路线.md
test -f docs/architecture/总体架构.md
test -f docs/architecture/AI服务设计.md
test -f docs/api/接口规范.md
test -f docs/handover/开发交接说明.md
```

Expected: all commands exit with code 0.

- [ ] **Step 6: Commit documentation skeleton**

Run:

```bash
git add docs/product docs/architecture docs/api docs/handover
git commit -m "docs: add Chinese project documentation skeleton"
```

Expected: commit succeeds.

## Task 4: Prepare User-Executed Scaffold Prompts

**Files:**

- Create or Modify: `docs/handover/开发交接说明.md`
- Read: `.codex/scaffolding-protocol.md`

- [ ] **Step 1: Confirm scaffold order**

Use this order:

```txt
1. pnpm workspace root
2. NestJS API
3. Vue admin-web
4. FastAPI ai-service
5. uni-app mobile
```

- [ ] **Step 2: First command to ask the user to run**

When ready to scaffold the actual project, ask the user to run:

```bash
pnpm init
```

Expected user result: root `package.json` exists.

- [ ] **Step 3: Second command to ask the user to run**

After root package setup is reviewed, ask the user to run:

```bash
pnpm create nest apps/api
```

Expected user result: `apps/api` exists and contains a NestJS project.

- [ ] **Step 4: Third command to ask the user to run**

After NestJS config is normalized, ask the user to run:

```bash
pnpm create vite apps/admin-web --template vue-ts
```

Expected user result: `apps/admin-web` exists and contains a Vue 3 TypeScript project.

- [ ] **Step 5: Commit the scaffold prompt plan**

Run:

```bash
git add .codex/scaffolding-protocol.md docs/handover/开发交接说明.md
git commit -m "docs: define scaffold handoff protocol"
```

Expected: commit succeeds if files changed. If Git says there is nothing to commit, continue.

## Task 5: Final Verification

**Files:**

- Read: `AGENTS.md`
- Read: `.codex/*.md`
- Read: `docs/**/*.md`

- [ ] **Step 1: Scan for placeholders**

Run:

```bash
placeholder_pattern='TBD|TO''DO|待定|占位|implement'' later|fill'' in'
rg -n "$placeholder_pattern" AGENTS.md .codex docs --glob '!docs/superpowers/plans/**'
```

Expected: no output.

- [ ] **Step 2: Check git status**

Run:

```bash
git status --short --branch
```

Expected: clean working tree on `main`.

- [ ] **Step 3: Optional push**

Only push after user approval:

```bash
git push -u origin main
```

Expected: branch `main` is pushed to `origin`.
