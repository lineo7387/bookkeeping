# packages/config Agent 协作说明

## 包定位

`packages/config` 是规划中的共享工程配置包，用于沉淀 tsconfig、eslint、prettier、测试和构建基础配置。当前仅维护协作说明，尚未创建代码脚手架。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `.agents/development-rules.md`
3. 受影响应用或包的 `AGENTS.md`
4. 受影响 package 的 `package.json` 和 tsconfig 配置

## 推荐 Agent Skills

- `systematic-debugging`：修复 lint、typecheck、构建配置或 workspace 解析问题前使用。
- `verification-before-completion`：声明完成、提交或交付前使用。

## 技术栈最佳实践

- 共享配置应小而稳定，优先减少重复，不制造复杂继承链。
- TypeScript 配置按运行环境拆分，例如 base、node、browser、vue。
- ESLint/Prettier 配置应服务当前项目，不盲目引入大而全规则。
- 任何配置变更都要运行受影响 package 的 typecheck 或 build。
- 不在配置包中放业务常量、接口地址、密钥或运行时业务逻辑。

## 推荐目录架构

脚手架创建后优先保持以下形态：

```txt
src/
  tsconfig/
    base.json
    node.json
    browser.json
    vue.json
  eslint/
  prettier/
  index.ts
```

如果只需要静态 JSON 配置，可以不创建 `src`，直接按工具约定导出。

## 禁止事项

- 不要把业务配置和工程配置混在一起。
- 不要为一个应用的临时需求污染所有 workspace。
- 不要在未验证受影响包的情况下批量改 tsconfig 或 lint 规则。
