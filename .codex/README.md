# Codex 适配入口

本目录只保留给 Codex 的兼容入口。项目共享规则的唯一维护源在 `.agents/`。

## 读取顺序

1. `AGENTS.md`
2. `.agents/README.md`
3. `.agents/project-context.md`
4. `.agents/development-rules.md`
5. `.agents/skills.md`
6. `.agents/skills/README.md`
7. 当前工作目录最近的 `AGENTS.md`
8. 本次功能对应的中文模块文档

## 文件映射

- `.codex/project-context.md` -> `.agents/project-context.md`
- `.codex/development-rules.md` -> `.agents/development-rules.md`
- `.codex/scaffolding-protocol.md` -> `.agents/scaffolding-protocol.md`
- `.codex/ai-service-guidelines.md` -> `.agents/ai-service-guidelines.md`
- `.codex/checklists/startup.md` -> `.agents/checklists/startup.md`
- `.codex/checklists/handoff.md` -> `.agents/checklists/handoff.md`
- `.codex/prompts/README.md` -> `.agents/prompts/README.md`
