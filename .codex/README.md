# Codex 项目上下文

这个目录用于存放给 Codex、Agent 和后续 AI 协作者使用的项目上下文、规则和提示词。

## 文件说明

- `project-context.md`：项目目标、架构和关键业务边界。
- `development-rules.md`：开发、文档、测试、提交和脚手架协作规则。
- `scaffolding-protocol.md`：项目创建阶段的命令提示和职责边界。
- `ai-service-guidelines.md`：FastAPI AI 服务、模型调用和候选结果规范。
- `checklists/`：新对话启动和收尾交接的短清单，用于减少重复粘贴长提示词。
- `prompts/`：后续可复用的提示词模板。

## 使用原则

Agent 进入项目后，应先阅读根目录 `AGENTS.md`，再按任务阅读本目录中的具体文件。
