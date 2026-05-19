# apps/ai-service Agent 协作说明

## 模块定位

`apps/ai-service` 是 FastAPI 独立 AI 服务，只负责文本记账解析、票据识别、分类建议和消费洞察等 AI 能力。它不对前端开放，不维护主业务状态。

当前已由用户使用 `uv` 创建最小 Python 项目，并已接入 M4 文本记账内部契约 `POST /internal/ai/text-transaction` 的确定性 MVP parser。后续新增依赖优先使用 `uv add` 或 `uv add --dev`。

## 修改前检查

修改本目录前，应先阅读：

1. 根目录 `AGENTS.md`
2. `.codex/development-rules.md`
3. `docs/modules/ai-service/AI服务规范.md`
4. `docs/architecture/AI服务设计.md`
5. 涉及候选结果或正式流水时，阅读流水、分类、账户相关模块文档

## 推荐 Agent Skills

- `fastapi`：修改 FastAPI 路由、依赖、Pydantic 模型、内部契约或 Python 测试前使用。
- `test-driven-development`：新增解析器、候选结果结构、置信度规则或异常处理前使用。
- `systematic-debugging`：修复解析错误、模型响应异常、测试失败前使用。
- `verification-before-completion`：声明完成、提交或交付前使用。

## 技术栈最佳实践

- 使用 FastAPI + Pydantic，参数和依赖声明优先使用 `typing.Annotated`。
- 路由必须返回明确的 response model 或返回类型，避免泄露内部字段。
- AI 服务接口以内网调用为主，不承担用户认证和账本权限。
- Prompt、模型适配、解析后处理和路由层分离，便于测试。
- AI 输出必须结构化为候选结果，包含置信度、原始输入、可解释字段和待确认状态。
- 失败时返回可诊断错误，不返回半成品正式流水。
- 配置通过环境变量和配置模块读取，不把模型密钥写入代码。

## 推荐目录架构

脚手架创建后优先保持以下形态：

```txt
app/
  main.py
  core/
    config.py
    logging.py
  api/
    routes/
      health.py
      text_transactions.py
      receipt_ocr.py
  schemas/
    ai_candidates.py
    text_transactions.py
    receipts.py
  services/
    text_transaction_parser.py
    receipt_ocr_service.py
    category_classifier.py
  providers/
    llm_client.py
    ocr_client.py
  tests/
    test_text_transaction_parser.py
    test_receipt_ocr.py
```

## 服务边界

- NestJS 负责认证、权限、AI 任务状态和正式流水创建。
- FastAPI 只返回候选结果，不直接写 PostgreSQL 主业务表。
- 前端、移动端和 `api-client` 不直接调用 FastAPI。
- 与 NestJS 的内部 API 契约必须有中文文档和测试覆盖。

## 验证命令

脚手架创建后再以实际工具为准，优先提供：

```bash
uv run pytest
uv run fastapi dev
```

## 禁止事项

- 不要创建正式交易流水。
- 不要判断账本成员权限。
- 不要暴露给前端直接调用。
- 不要把模型密钥、OCR 密钥或真实票据样例提交到仓库。
