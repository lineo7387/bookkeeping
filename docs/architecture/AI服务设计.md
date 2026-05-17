# AI 服务设计

详细模块规范见 `docs/modules/ai-service/AI服务规范.md`。本文只描述架构层概要。

## 服务定位

AI 服务只返回候选结果，不直接写入正式交易流水。

FastAPI 是 internal-only 服务，只允许 NestJS 或受控后台任务调用；前端、移动端和后台 Web 都只能调用 NestJS。

## 标准流程

1. 用户输入文本或上传票据。
2. NestJS 校验账本权限。
3. NestJS 创建 `ai_task`。
4. FastAPI 返回结构化候选结果。
5. NestJS 保存 `ai_extraction`。
6. 用户确认。
7. NestJS 创建 `transaction`。

## 第一阶段能力

- 文本记账解析。
- 票据 OCR 识别。
- 自动分类建议。

## 隐私要求

- 只发送完成当前任务所需的最小上下文。
- 日志不能输出手机号、邮箱、token、API Key 或完整票据 URL。
- 用户拒绝的候选结果保留状态，便于排查和优化。
