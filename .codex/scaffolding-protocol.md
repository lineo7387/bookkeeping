# 脚手架创建协作协议

## 原则

项目创建阶段采用“用户执行脚手架，Codex 修改配置”的方式。

Codex 可以：

- 给出创建命令。
- 解释命令目的。
- 检查创建结果。
- 修改配置文件。
- 补充目录结构。
- 添加中文文档模板。
- 调整 monorepo、lint、format、env、Prisma、Docker 等配置。

Codex 不应：

- 未经用户执行步骤，直接运行创建框架的脚手架命令。
- 在用户未确认时一次性创建所有应用。
- 把框架初始化和业务功能实现混在一个步骤中。

## 推荐创建顺序

第一批：

```bash
pnpm create nest apps/api
```

第二批：

```bash
pnpm create vite apps/admin-web --template vue-ts
```

第三批：

```bash
# uni-app 创建命令需根据当前 HBuilderX/CLI 方案确认后再执行
```

第四批：

```bash
# FastAPI 服务可以由 Codex 在 apps/ai-service 中补最小结构
# 如果用户希望使用特定 Python 项目工具，再按该工具创建
```

## 每次创建后的检查

用户执行脚手架后，Codex 应检查：

- 目录是否在预期位置。
- package 名称是否符合 monorepo 规范。
- TypeScript 配置是否可被统一管理。
- lint、format、test 命令是否可统一调用。
- 是否需要删除模板示例代码。
- 是否需要补中文 README 或模块说明。
