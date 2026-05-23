# Claude 适配入口

本文件只作为 Claude/Claude Code 的项目入口。项目共享规则的唯一维护源在 `.agents/`。

## 读取顺序

1. `AGENTS.md`
2. `.agents/README.md`
3. `.agents/project-context.md`
4. `.agents/development-rules.md`
5. `.agents/skills.md`
6. 当前工作目录最近的 `AGENTS.md`
7. 本次功能对应的中文模块文档

如果 Claude Code 支持 Skill 工具，应按 `.agents/skills.md` 和子项目 `AGENTS.md` 中的推荐 skills 调用；仓库级 skill 副本位于 `.agents/skills/`。如果当前环境不支持，就把这些 skills 当作最佳实践清单阅读。
