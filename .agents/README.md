# Agent 共享项目上下文

这个目录是跨 Agent 工具共享的项目上下文、规则和提示词源。`AGENTS.md`、`.codex/`、`CLAUDE.md`、`GEMINI.md` 和 `.cursor/rules/` 只作为不同工具的适配入口，详细规则以本目录为准。

仓库级 skills 固定安装在 `.agents/skills/`，本目录的 `skills.md` 负责说明推荐列表、调用时机和跨工具降级规则。

## 文件说明

- `project-context.md`：项目目标、架构和关键业务边界。
- `development-rules.md`：开发、文档、测试、提交和脚手架协作规则。
- `scaffolding-protocol.md`：项目创建阶段的命令提示和职责边界。
- `ai-service-guidelines.md`：FastAPI AI 服务、模型调用和候选结果规范。
- `skills.md`：不同工作类型推荐使用的 Agent skills、仓库级安装位置，以及不支持 skills 的工具如何降级读取。
- `checklists/`：新对话启动和收尾交接的短清单，用于减少重复粘贴长提示词。
- `prompts/`：后续可复用的提示词模板。

## 使用原则

Agent 进入项目后，应先阅读根目录 `AGENTS.md`，再按任务阅读本目录中的具体文件。

如果某个工具不支持 skills 调用机制，应把 `skills.md`、`.agents/skills/<skill-name>/SKILL.md` 和各子项目 `AGENTS.md` 中的推荐 skills 当作最佳实践清单阅读；项目硬规则仍以根目录 `AGENTS.md`、`.agents/development-rules.md` 和中文模块文档为准。
