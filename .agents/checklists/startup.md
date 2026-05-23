# 新对话启动清单

用于减少每次继续开发时需要手动粘贴的大段提示词。新对话可直接说：按 `.agents/checklists/startup.md` 继续。

## 必跑命令

```bash
git status --short --branch
git log --oneline -8
```

## 必读上下文

1. `AGENTS.md`
2. 当前工作目录最近的 `AGENTS.md`
3. `.agents/project-context.md`
4. `.agents/development-rules.md`
5. `.agents/skills.md`
6. 任务相关的 `.agents/skills/<skill-name>/SKILL.md`
7. 本次功能对应的中文模块文档

## 当前优先级

- `main` 已合并 M4 AI 文本记账闭环、低置信度候选提示、独立 Admin AI 任务列表页和 `pnpm e2e:m4:ai-text` 本地闭环脚本。
- 后续路线：M5 是票据 OCR 与文件；M6 规划为 AI 财务问答与洞察。开始新功能前先补或读取对应中文模块文档。

## 禁止跳跃

- 不要把 M5 票据 OCR、M6 AI 财务问答和移动端页面混在同一轮实现。
- 不要做移动端页面。
- 不要让前端或 `@bookkeeping/api-client` 直接调用 FastAPI。
- 不要绕过 `SystemAdminGuard` 或 Ledger Policy。

## 本地调试提示

- NestJS API 默认前缀是 `/api`，例如 `POST /api/auth/login`。
- 后台 Web dev server 默认用 `/api` 代理到 `http://127.0.0.1:3000`。
- 如需创建本地系统管理员，使用 `pnpm --filter @bookkeeping/api admin:bootstrap -- --email <email> --password <password>`。
- M4 文本记账闭环可在 FastAPI 和 NestJS 均启动后运行 `pnpm e2e:m4:ai-text`；脚本只调用 NestJS 对外 API，不直接调用 FastAPI。
