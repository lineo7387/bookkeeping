# Bookkeeping Agent Rules

This repository keeps shared agent guidance in `.agents/`.

Read in this order:

1. `AGENTS.md`
2. `.agents/README.md`
3. `.agents/project-context.md`
4. `.agents/development-rules.md`
5. `.agents/skills.md`
6. The nearest `AGENTS.md` for the current working directory
7. The Simplified Chinese module document for the feature being changed

Cursor may not have a native skills runtime. In that case, treat `.agents/skills.md`, `.agents/skills/<skill-name>/SKILL.md`, and the recommended skills in each subproject `AGENTS.md` as workflow guidance, not as automatic tool capabilities.
