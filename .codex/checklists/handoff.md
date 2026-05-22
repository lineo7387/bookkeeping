# 收尾交接清单

用于每轮有代码、接口、文档或状态变更后的收尾检查。目标是避免新对话读到过期上下文。

## 上下文同步

检查是否需要同步：

1. `AGENTS.md`
2. 当前工作目录最近的子项目 `AGENTS.md`
3. `.codex/project-context.md`
4. `.codex/development-rules.md`
5. `docs/handover/开发交接说明.md`
6. 相关中文模块文档

如果变更了里程碑状态、模块边界、验证命令、禁止事项、下一轮建议或可用接口，应同步对应文档。

## 验证命令

按改动范围选择：

```bash
pnpm verify:admin-web
pnpm verify:api
pnpm verify:workspace-light
git diff --check
```

涉及 FastAPI AI 服务时额外运行：

```bash
cd apps/ai-service && uv run pytest
```

## 提交前检查

- `git status --short` 中只包含本轮相关文件。
- 不提交 `.env` 中的真实密钥或本地凭据。
- 不提交数据库里的本地状态；需要可重复状态时写脚本或文档。
- 提交信息使用英文 Conventional Commits。
- 用户未要求 push 时不要 push。
