# 仓库级 Agent Skills

本目录保存 Bookkeeping 项目当前推荐使用的仓库级 skills。后续 Agent 在本仓库内工作时，应优先读取这里的 `SKILL.md`，不要为了本项目修改个人全局 skills。

## 使用规则

- 项目推荐列表以 `.agents/skills.md` 和最近的子项目 `AGENTS.md` 为准。
- 支持原生仓库级 skills 的工具应加载 `.agents/skills/<skill-name>/SKILL.md`。
- 不支持原生加载的工具，应把对应 `SKILL.md` 当作工作方法文档阅读。
- skills 只能补充工作方法，不能覆盖根目录 `AGENTS.md`、`.agents/development-rules.md` 和中文模块文档。

## 已安装 Skills

通用流程：

- `using-superpowers`
- `brainstorming`
- `writing-plans`
- `executing-plans`
- `subagent-driven-development`
- `using-git-worktrees`
- `dispatching-parallel-agents`
- `test-driven-development`
- `systematic-debugging`
- `receiving-code-review`
- `requesting-code-review`
- `verification-before-completion`
- `finishing-a-development-branch`
- `writing-skills`

项目技术栈：

- `nestjs-best-practices`
- `fastapi`
- `vue-best-practices`
- `frontend-design`

`browser:browser` 由 Codex Browser 插件提供，依赖插件运行时代码，暂不作为普通 standalone skill 复制到本目录。
