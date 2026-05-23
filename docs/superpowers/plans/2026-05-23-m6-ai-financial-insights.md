# M6 AI Financial Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户可以通过 NestJS 对外 API 用自然语言询问账本收支、分类、账户和成员消费问题，并得到基于真实查询结果的 AI 答复与可追溯引用数据。

**Architecture:** NestJS 仍是唯一对外入口和数据工具执行方；FastAPI 只做 intent 分类、工具选择和基于工具结果组织答复。M6 复用 `ai_tasks.type = insight`，新增 `ai_insight_results` 保存脱敏问题摘要、intent、答复、工具结果和引用数据，不复用 `ai_extractions`，避免把问答结果误建模为待确认流水候选。

**Tech Stack:** NestJS 11, Prisma 7, FastAPI, Pydantic, pytest, Jest, pnpm workspace, `@bookkeeping/shared-types`, `@bookkeeping/api-client`

**Spec Inputs:**
- `docs/superpowers/specs/2026-05-17-bookkeeping-platform-design.md`
- `docs/modules/ai/AI财务问答与洞察规划.md`
- `docs/modules/statistics/基础统计说明.md`
- `docs/modules/ai-service/AI服务规范.md`

---

## File Structure

- Modify `apps/api/prisma/schema.prisma`: add `AiInsightIntent` enum, `AiInsightResult` model, and relations from `AiTask`, `Ledger`, and `User`.
- Create `apps/api/src/ai/dto/chat-ai-insight.dto.ts`: validates `POST /ledgers/:ledgerId/ai/insights/chat` request body.
- Modify `apps/api/src/ai/ai.types.ts`: add M6 public, internal, tool-call, and persistence types.
- Modify `apps/api/src/ai/ai.controller.ts`: expose the new M6 chat endpoint behind `JwtAuthGuard`.
- Modify `apps/api/src/ai/ai.service.ts`: orchestrate task creation, intent routing, tool execution, answer generation, result saving, and task status transitions.
- Modify `apps/api/src/ai/ai.repository.ts`: create insight task/result, fetch ledger context, and map result records.
- Create `apps/api/src/ai/ai-insight-tools.service.ts`: execute the only approved ledger data tools using existing statistics and transaction visibility rules.
- Modify `apps/api/src/ai/ai-internal-client.ts`: call FastAPI insight route and validate response shape.
- Modify `apps/api/src/ai/ai.module.ts`: provide the new tools service and inject `StatisticsModule` / `TransactionsModule` if they are not already imported.
- Modify NestJS tests under `apps/api/src/ai/*.spec.ts`: cover DTO validation, controller route, service routing, internal client validation, repository persistence, and tools privacy filtering.
- Modify `packages/shared-types/src/index.ts`: export stable M6 response, intent, tool, reference, and task detail types.
- Modify `packages/api-client/src/index.ts`: add `chatAiInsight(ledgerId, body)`.
- Create `apps/ai-service/app/schemas/insights.py`: Pydantic request and response contracts for the internal M6 route.
- Create `apps/ai-service/app/services/insight_service.py`: deterministic MVP intent classifier, tool selector, and answer composer.
- Create `apps/ai-service/app/api/routes/insights.py`: internal FastAPI route `POST /internal/ai/insights/chat`.
- Modify `apps/ai-service/app/main.py`: include the new insights router.
- Create `apps/ai-service/tests/test_insights.py`: contract tests for classification, tool choice, answer generation, and validation.
- Modify `docs/modules/ai/AI财务问答与洞察规划.md`: promote from planning note to implemented module doc with API, data model, permissions, errors, and verification.
- Modify `docs/modules/ai-service/AI服务规范.md`, `docs/modules/api/NestJS服务说明.md`, `docs/modules/shared-packages/共享包说明.md`, `docs/api/接口规范.md`, `.agents/project-context.md`, `AGENTS.md`, and `docs/handover/开发交接说明.md`: synchronize M6 status and boundaries after implementation.
- Create `scripts/e2e-m6-ai-insights.sh`: local closed-loop script that calls only NestJS public API.
- Modify `package.json`: add `e2e:m6:ai-insights`.

---

## Task 1: Prisma Schema — AI Insight Result Persistence

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Write schema change**

Add the enum after `enum AiExtractionStatus`:

```prisma
enum AiInsightIntent {
  ledger_insight
  text_accounting
  app_help
  general_knowledge
  unsupported
}
```

In `model User`, add:

```prisma
  aiInsightResults     AiInsightResult[]
```

In `model Ledger`, add:

```prisma
  aiInsightResults AiInsightResult[]
```

In `model AiTask`, add:

```prisma
  insightResult AiInsightResult?
```

Add the model after `AiExtraction`:

```prisma
model AiInsightResult {
  id          String          @id @default(uuid())
  aiTaskId    String          @unique @map("ai_task_id")
  ledgerId    String          @map("ledger_id")
  userId      String          @map("user_id")
  intent      AiInsightIntent
  question    String
  answer      String
  references  Json?           @db.JsonB
  toolResults Json?           @map("tool_results") @db.JsonB
  rawResult   Json?           @map("raw_result") @db.JsonB
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")
  aiTask      AiTask          @relation(fields: [aiTaskId], references: [id], onDelete: Cascade)
  ledger      Ledger          @relation(fields: [ledgerId], references: [id], onDelete: Cascade)
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([ledgerId, createdAt])
  @@index([userId, createdAt])
  @@index([intent])
  @@map("ai_insight_results")
}
```

- [ ] **Step 2: Generate Prisma client and migration**

Run:

```bash
cd apps/api && pnpm prisma:generate
cd apps/api && pnpm prisma:migrate --name add_ai_insight_results
```

Expected: Prisma generates successfully; migration SQL creates `AiInsightIntent` and `ai_insight_results` with unique index on `ai_task_id`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add ai insight result model"
```

---

## Task 2: Shared Types — Public M6 Contract

**Files:**
- Modify: `packages/shared-types/src/index.ts`

- [ ] **Step 1: Add insight response and tool types**

Append after `ReceiptOcrAcceptedResult`:

```ts
export type AiInsightIntent =
  | 'ledger_insight'
  | 'text_accounting'
  | 'app_help'
  | 'general_knowledge'
  | 'unsupported';

export type AiInsightToolName =
  | 'monthly_summary'
  | 'category_breakdown'
  | 'account_balances'
  | 'member_expenses'
  | 'recent_transactions';

export interface AiInsightToolCall {
  name: AiInsightToolName;
  arguments: {
    period?: 'this_week' | 'this_month' | 'last_month';
    occurredFrom?: string;
    occurredTo?: string;
    type?: CategoryType;
    limit?: number;
  };
}

export interface AiInsightReference {
  toolName: AiInsightToolName;
  label: string;
  data: unknown;
}

export interface AiInsightChatResult {
  taskId: string;
  ledgerId: string;
  status: AiTaskStatus;
  intent: AiInsightIntent;
  answer: string;
  references: AiInsightReference[];
  suggestedNextAction: 'show_statistics' | 'start_text_accounting' | 'show_help' | 'none';
}
```

- [ ] **Step 2: Extend `AiTaskDetail`**

Add an optional insight result field:

```ts
export interface AiTaskDetail {
  id: string;
  ledgerId: string;
  type: AiTaskType;
  status: AiTaskStatus;
  errorMessage: string | null;
  extraction: AiExtractionSummary | null;
  insight?: AiInsightChatResult | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Verify package**

Run:

```bash
pnpm --filter @bookkeeping/shared-types typecheck
pnpm --filter @bookkeeping/shared-types build
```

Expected: both commands pass.

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat: add ai insight shared types"
```

---

## Task 3: FastAPI Contract — Insight Schemas, Service, Route

**Files:**
- Create: `apps/ai-service/app/schemas/insights.py`
- Create: `apps/ai-service/app/services/insight_service.py`
- Create: `apps/ai-service/app/api/routes/insights.py`
- Modify: `apps/ai-service/app/main.py`
- Create: `apps/ai-service/tests/test_insights.py`

- [ ] **Step 1: Add failing FastAPI tests**

Create `apps/ai-service/tests/test_insights.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_insight_ledger_question_requests_summary_tools():
    response = client.post(
        "/internal/ai/insights/chat",
        json={
            "taskId": "task_1",
            "ledgerId": "ledger_1",
            "userId": "user_1",
            "question": "这周花了多少钱，主要花在哪",
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "defaultCurrency": "CNY",
            "availableTools": ["monthly_summary", "category_breakdown"],
            "toolResults": [],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["taskId"] == "task_1"
    assert body["intent"] == "ledger_insight"
    assert body["needsLedgerData"] is True
    assert [call["name"] for call in body["toolCalls"]] == ["monthly_summary", "category_breakdown"]
    assert body["answer"] is None


def test_insight_answer_uses_tool_results_without_inventing_amounts():
    response = client.post(
        "/internal/ai/insights/chat",
        json={
            "taskId": "task_1",
            "ledgerId": "ledger_1",
            "userId": "user_1",
            "question": "这周花了多少钱，主要花在哪",
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "defaultCurrency": "CNY",
            "availableTools": ["monthly_summary", "category_breakdown"],
            "toolResults": [
                {"toolName": "monthly_summary", "data": {"expense": "350.50", "income": "100.00", "net": "-250.50"}},
                {"toolName": "category_breakdown", "data": {"items": [{"categoryName": "餐饮", "amount": "200.00", "percentage": "57.06"}]}},
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "ledger_insight"
    assert body["needsLedgerData"] is False
    assert body["toolCalls"] == []
    assert "350.50" in body["answer"]
    assert "餐饮" in body["answer"]
    assert body["references"][0]["toolName"] == "monthly_summary"


def test_insight_text_accounting_intent_never_requests_ledger_tools():
    response = client.post(
        "/internal/ai/insights/chat",
        json={
            "taskId": "task_2",
            "ledgerId": "ledger_1",
            "userId": "user_1",
            "question": "今天午饭花了38",
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "defaultCurrency": "CNY",
            "availableTools": ["monthly_summary"],
            "toolResults": [],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "text_accounting"
    assert body["needsTransactionCreation"] is True
    assert body["needsLedgerData"] is False
    assert body["toolCalls"] == []
```

Run:

```bash
cd apps/ai-service && uv run pytest tests/test_insights.py
```

Expected: fails because the route does not exist.

- [ ] **Step 2: Add Pydantic schemas**

Create `apps/ai-service/app/schemas/insights.py`:

```python
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


InsightIntent = Literal["ledger_insight", "text_accounting", "app_help", "general_knowledge", "unsupported"]
InsightToolName = Literal["monthly_summary", "category_breakdown", "account_balances", "member_expenses", "recent_transactions"]


class InsightToolCall(BaseModel):
    name: InsightToolName
    arguments: dict[str, object] = Field(default_factory=dict)


class InsightToolResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tool_name: InsightToolName = Field(alias="toolName")
    data: dict[str, object]


class InsightReference(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tool_name: InsightToolName = Field(alias="toolName")
    label: str
    data: dict[str, object]


class InsightChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(min_length=1, alias="taskId")
    ledger_id: str = Field(min_length=1, alias="ledgerId")
    user_id: str = Field(min_length=1, alias="userId")
    question: str = Field(min_length=1, max_length=500)
    locale: str = "zh-CN"
    timezone: str = "Asia/Shanghai"
    default_currency: str = Field(default="CNY", min_length=3, max_length=3, alias="defaultCurrency")
    available_tools: list[InsightToolName] = Field(default_factory=list, alias="availableTools")
    tool_results: list[InsightToolResult] = Field(default_factory=list, alias="toolResults")

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("question must not be blank")
        return stripped


class InsightChatResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(alias="taskId")
    intent: InsightIntent
    needs_ledger_data: bool = Field(alias="needsLedgerData")
    needs_transaction_creation: bool = Field(alias="needsTransactionCreation")
    tool_calls: list[InsightToolCall] = Field(default_factory=list, alias="toolCalls")
    answer: str | None = None
    references: list[InsightReference] = Field(default_factory=list)
    raw_result: dict[str, object] = Field(alias="rawResult")
```

- [ ] **Step 3: Add deterministic service**

Create `apps/ai-service/app/services/insight_service.py`:

```python
from app.schemas.insights import InsightChatRequest, InsightChatResponse, InsightReference, InsightToolCall


def handle_insight_chat(request: InsightChatRequest) -> InsightChatResponse:
    intent = classify_intent(request.question)
    if intent == "ledger_insight":
        if not request.tool_results:
            tool_calls = select_tools(request.question, request.available_tools)
            return InsightChatResponse(
                taskId=request.task_id,
                intent=intent,
                needsLedgerData=True,
                needsTransactionCreation=False,
                toolCalls=tool_calls,
                answer=None,
                references=[],
                rawResult={"provider": "deterministic-insight", "stage": "tool_selection"},
            )
        references = [
            InsightReference(toolName=result.tool_name, label=label_for_tool(result.tool_name), data=result.data)
            for result in request.tool_results
        ]
        return InsightChatResponse(
            taskId=request.task_id,
            intent=intent,
            needsLedgerData=False,
            needsTransactionCreation=False,
            toolCalls=[],
            answer=compose_ledger_answer(request.tool_results),
            references=references,
            rawResult={"provider": "deterministic-insight", "stage": "answer_generation"},
        )

    return InsightChatResponse(
        taskId=request.task_id,
        intent=intent,
        needsLedgerData=False,
        needsTransactionCreation=intent == "text_accounting",
        toolCalls=[],
        answer=answer_for_non_ledger_intent(intent),
        references=[],
        rawResult={"provider": "deterministic-insight", "stage": "intent_classification"},
    )


def classify_intent(question: str) -> str:
    text = question.strip()
    accounting_words = ("花了", "收入", "支出", "买", "午饭", "晚饭", "支付")
    insight_words = ("多少", "主要", "占比", "统计", "本周", "这周", "本月", "上个月", "余额", "谁花")
    help_words = ("怎么", "如何", "创建账本", "邀请成员", "使用")
    if any(word in text for word in insight_words):
        return "ledger_insight"
    if any(word in text for word in accounting_words) and any(char.isdigit() for char in text):
        return "text_accounting"
    if any(word in text for word in help_words):
        return "app_help"
    if any(word in text for word in ("投资建议", "借贷", "医疗", "违法")):
        return "unsupported"
    return "general_knowledge"


def select_tools(question: str, available_tools: list[str]) -> list[InsightToolCall]:
    calls: list[InsightToolCall] = []
    period = "this_week" if "周" in question else "this_month"
    if "monthly_summary" in available_tools:
        calls.append(InsightToolCall(name="monthly_summary", arguments={"period": period}))
    if ("主要" in question or "占比" in question) and "category_breakdown" in available_tools:
        calls.append(InsightToolCall(name="category_breakdown", arguments={"period": period, "type": "expense"}))
    if "余额" in question and "account_balances" in available_tools:
        calls.append(InsightToolCall(name="account_balances", arguments={}))
    if "谁" in question and "member_expenses" in available_tools:
        calls.append(InsightToolCall(name="member_expenses", arguments={"period": period}))
    return calls


def compose_ledger_answer(tool_results: list[object]) -> str:
    parts: list[str] = []
    for result in tool_results:
        tool_name = getattr(result, "tool_name")
        data = getattr(result, "data")
        if tool_name == "monthly_summary":
            expense = data.get("expense", "0.00")
            income = data.get("income", "0.00")
            net = data.get("net", "0.00")
            parts.append(f"这段时间支出 {expense}，收入 {income}，结余 {net}。")
        if tool_name == "category_breakdown":
            items = data.get("items", [])
            if isinstance(items, list) and items:
                top = items[0]
                if isinstance(top, dict):
                    parts.append(f"主要支出分类是 {top.get('categoryName') or '未分类'}，金额 {top.get('amount', '0.00')}，占比 {top.get('percentage', '0.00')}%。")
    return "".join(parts) or "我已根据可见账本数据完成查询，但当前没有可汇总的数据。"


def answer_for_non_ledger_intent(intent: str) -> str:
    if intent == "text_accounting":
        return "这看起来是记账录入，请使用文本记账候选确认流程。"
    if intent == "app_help":
        return "你可以在账本内创建账户、分类和流水；家庭账本可邀请成员协作。"
    if intent == "unsupported":
        return "这个问题超出当前记账助手的安全边界。"
    return "我是记账助手，更擅长回答账本统计、消费结构和记账相关问题。"


def label_for_tool(tool_name: str) -> str:
    labels = {
        "monthly_summary": "收支汇总",
        "category_breakdown": "分类占比",
        "account_balances": "账户余额",
        "member_expenses": "成员消费",
        "recent_transactions": "流水样本",
    }
    return labels.get(tool_name, tool_name)
```

- [ ] **Step 4: Add route and register it**

Create `apps/ai-service/app/api/routes/insights.py`:

```python
from fastapi import APIRouter

from app.schemas.insights import InsightChatRequest, InsightChatResponse
from app.services.insight_service import handle_insight_chat


router = APIRouter(prefix="/internal/ai", tags=["internal-ai"])


@router.post("/insights/chat")
async def insight_chat_endpoint(request: InsightChatRequest) -> InsightChatResponse:
    return handle_insight_chat(request)
```

Modify `apps/ai-service/app/main.py`:

```python
from fastapi import FastAPI

from app.api.routes.text_transactions import router as text_transactions_router
from app.api.routes.receipt_ocr import router as receipt_ocr_router
from app.api.routes.insights import router as insights_router

app = FastAPI(title="Bookkeeping AI Service")
app.include_router(text_transactions_router)
app.include_router(receipt_ocr_router)
app.include_router(insights_router)
```

- [ ] **Step 5: Verify FastAPI tests**

Run:

```bash
cd apps/ai-service && uv run pytest tests/test_insights.py
cd apps/ai-service && uv run pytest
```

Expected: all FastAPI tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/ai-service/app apps/ai-service/tests/test_insights.py
git commit -m "feat: add ai insight internal service contract"
```

---

## Task 4: NestJS DTO and Internal Types

**Files:**
- Create: `apps/api/src/ai/dto/chat-ai-insight.dto.ts`
- Modify: `apps/api/src/ai/ai.types.ts`
- Modify: `apps/api/src/ai/ai.dto.spec.ts`

- [ ] **Step 1: Add failing DTO test**

Append to `apps/api/src/ai/ai.dto.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChatAiInsightDto } from './dto/chat-ai-insight.dto';

describe('ChatAiInsightDto', () => {
  it('accepts a bounded insight question', async () => {
    const dto = plainToInstance(ChatAiInsightDto, {
      question: '这周花了多少钱，主要花在哪',
      locale: 'zh-CN',
    });

    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
  });

  it('rejects blank and overlong questions', async () => {
    const blank = plainToInstance(ChatAiInsightDto, { question: '   ' });
    const overlong = plainToInstance(ChatAiInsightDto, { question: '问'.repeat(501) });

    await expect(validate(blank, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'question' })]),
    );
    await expect(validate(overlong, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'question' })]),
    );
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.dto.spec.ts
```

Expected: fails because `ChatAiInsightDto` does not exist.

- [ ] **Step 2: Create DTO**

Create `apps/api/src/ai/dto/chat-ai-insight.dto.ts`:

```ts
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatAiInsightDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  defaultCurrency?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  now?: string;
}
```

- [ ] **Step 3: Add internal and public types**

Append to `apps/api/src/ai/ai.types.ts`:

```ts
import type {
  AiInsightChatResult,
  AiInsightIntent,
  AiInsightReference,
  AiInsightToolCall,
  AiInsightToolName,
} from '@bookkeeping/shared-types';

export interface CreateAiInsightResultData {
  aiTaskId: string;
  ledgerId: string;
  userId: string;
  intent: AiInsightIntent;
  question: string;
  answer: string;
  references: AiInsightReference[];
  toolResults: InternalAiInsightToolResult[];
  rawResult: Record<string, unknown>;
}

export interface InternalAiInsightToolResult {
  toolName: AiInsightToolName;
  data: Record<string, unknown>;
}

export interface InternalAiInsightRequest {
  taskId: string;
  ledgerId: string;
  userId: string;
  question: string;
  locale: string;
  timezone: string;
  defaultCurrency: string;
  availableTools: AiInsightToolName[];
  toolResults: InternalAiInsightToolResult[];
}

export interface InternalAiInsightResponse {
  taskId: string;
  intent: AiInsightIntent;
  needsLedgerData: boolean;
  needsTransactionCreation: boolean;
  toolCalls: AiInsightToolCall[];
  answer: string | null;
  references: AiInsightReference[];
  rawResult: Record<string, unknown>;
}

export interface InsightContext {
  timezone: string;
  defaultCurrency: string;
}

export type AiInsightResultDetail = AiInsightChatResult;
```

- [ ] **Step 4: Verify DTO tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.dto.spec.ts
```

Expected: DTO tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/dto/chat-ai-insight.dto.ts apps/api/src/ai/ai.types.ts apps/api/src/ai/ai.dto.spec.ts
git commit -m "feat: add ai insight dto and types"
```

---

## Task 5: NestJS Internal Client — Insight Contract Validation

**Files:**
- Modify: `apps/api/src/ai/ai-internal-client.ts`
- Modify: `apps/api/src/ai/ai-internal-client.spec.ts`

- [ ] **Step 1: Add failing internal client tests**

Append to `apps/api/src/ai/ai-internal-client.spec.ts`:

```ts
it('calls the insight chat internal endpoint and validates response shape', async () => {
  fetchImpl.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        taskId: 'task_1',
        intent: 'ledger_insight',
        needsLedgerData: true,
        needsTransactionCreation: false,
        toolCalls: [{ name: 'monthly_summary', arguments: { period: 'this_week' } }],
        answer: null,
        references: [],
        rawResult: { provider: 'deterministic-insight' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );

  await expect(
    client.chatInsight({
      taskId: 'task_1',
      ledgerId: 'ledger_1',
      userId: 'user_1',
      question: '这周花了多少钱',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      defaultCurrency: 'CNY',
      availableTools: ['monthly_summary'],
      toolResults: [],
    }),
  ).resolves.toMatchObject({
    intent: 'ledger_insight',
    toolCalls: [{ name: 'monthly_summary' }],
  });

  expect(fetchImpl).toHaveBeenCalledWith(
    'http://127.0.0.1:8000/internal/ai/insights/chat',
    expect.objectContaining({ method: 'POST' }),
  );
});

it('rejects invalid insight responses', async () => {
  fetchImpl.mockResolvedValueOnce(
    new Response(JSON.stringify({ intent: 'ledger_insight' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  await expect(
    client.chatInsight({
      taskId: 'task_1',
      ledgerId: 'ledger_1',
      userId: 'user_1',
      question: '这周花了多少钱',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      defaultCurrency: 'CNY',
      availableTools: ['monthly_summary'],
      toolResults: [],
    }),
  ).rejects.toMatchObject({
    response: { success: false, error: { code: 'AI_TASK_FAILED' } },
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai-internal-client.spec.ts
```

Expected: fails because `chatInsight` does not exist.

- [ ] **Step 2: Add `chatInsight` method**

In `apps/api/src/ai/ai-internal-client.ts`, extend imports with:

```ts
import type { InternalAiInsightRequest, InternalAiInsightResponse } from './ai.types';
```

Add method inside `AiInternalClient`:

```ts
async chatInsight(request: InternalAiInsightRequest): Promise<InternalAiInsightResponse> {
  const baseUrl = this.configService.get<string>('AI_SERVICE_BASE_URL') ?? 'http://127.0.0.1:8000';
  const timeoutMs = getTimeoutMs(this.configService.get<string>('AI_INSIGHT_TIMEOUT_MS'));
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  let response: Response;
  try {
    response = await this.fetchImpl(`${baseUrl.replace(/\/+$/, '')}/internal/ai/insights/chat`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: abortController.signal,
      body: JSON.stringify(request),
    });
  } catch {
    throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI insight service request failed'));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI insight service request failed'));
  }

  const body = (await response.json()) as unknown;
  if (!isInternalAiInsightResponse(body)) {
    throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI insight service response is invalid'));
  }

  return body;
}
```

Add validators near the existing response validators:

```ts
function isInternalAiInsightResponse(value: unknown): value is InternalAiInsightResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.taskId === 'string' &&
    isInsightIntent(body.intent) &&
    typeof body.needsLedgerData === 'boolean' &&
    typeof body.needsTransactionCreation === 'boolean' &&
    Array.isArray(body.toolCalls) &&
    body.toolCalls.every(isInsightToolCall) &&
    (body.answer === null || typeof body.answer === 'string') &&
    Array.isArray(body.references) &&
    body.references.every(isInsightReference) &&
    isRecord(body.rawResult)
  );
}

function isInsightIntent(value: unknown): boolean {
  return (
    value === 'ledger_insight' ||
    value === 'text_accounting' ||
    value === 'app_help' ||
    value === 'general_knowledge' ||
    value === 'unsupported'
  );
}

function isInsightToolCall(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const call = value as Record<string, unknown>;
  return isInsightToolName(call.name) && isRecord(call.arguments);
}

function isInsightReference(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const ref = value as Record<string, unknown>;
  return isInsightToolName(ref.toolName) && typeof ref.label === 'string' && isRecord(ref.data);
}

function isInsightToolName(value: unknown): boolean {
  return (
    value === 'monthly_summary' ||
    value === 'category_breakdown' ||
    value === 'account_balances' ||
    value === 'member_expenses' ||
    value === 'recent_transactions'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
```

- [ ] **Step 3: Verify internal client tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai-internal-client.spec.ts
```

Expected: all internal client tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai/ai-internal-client.ts apps/api/src/ai/ai-internal-client.spec.ts
git commit -m "feat: add ai insight internal client"
```

---

## Task 6: NestJS Tools — Controlled Ledger Data Queries

**Files:**
- Create: `apps/api/src/ai/ai-insight-tools.service.ts`
- Create: `apps/api/src/ai/ai-insight-tools.service.spec.ts`
- Modify: `apps/api/src/ai/ai.module.ts`

- [ ] **Step 1: Add failing tool service tests**

Create `apps/api/src/ai/ai-insight-tools.service.spec.ts`:

```ts
import { StatisticsService } from '../statistics/statistics.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AiInsightToolsService } from './ai-insight-tools.service';

describe('AiInsightToolsService', () => {
  let statisticsService: jest.Mocked<Pick<StatisticsService, 'getMonthlySummary' | 'getCategoryBreakdown' | 'getAccountBalances' | 'getMemberExpenses'>>;
  let transactionsService: jest.Mocked<Pick<TransactionsService, 'listTransactions'>>;
  let service: AiInsightToolsService;

  beforeEach(() => {
    statisticsService = {
      getMonthlySummary: jest.fn(),
      getCategoryBreakdown: jest.fn(),
      getAccountBalances: jest.fn(),
      getMemberExpenses: jest.fn(),
    };
    transactionsService = {
      listTransactions: jest.fn(),
    };
    service = new AiInsightToolsService(statisticsService as unknown as StatisticsService, transactionsService as unknown as TransactionsService);
  });

  it('executes approved summary tools through existing services', async () => {
    statisticsService.getMonthlySummary.mockResolvedValue({
      ledgerId: 'ledger_1',
      occurredFrom: '2026-05-17T16:00:00.000Z',
      occurredTo: '2026-05-24T15:59:59.999Z',
      income: '100.00',
      expense: '350.50',
      net: '-250.50',
    });

    const result = await service.execute('user_1', 'ledger_1', 'Asia/Shanghai', new Date('2026-05-23T12:00:00.000Z'), {
      name: 'monthly_summary',
      arguments: { period: 'this_week' },
    });

    expect(result).toMatchObject({ toolName: 'monthly_summary', data: { expense: '350.50' } });
    expect(statisticsService.getMonthlySummary).toHaveBeenCalledWith(
      'user_1',
      'ledger_1',
      expect.objectContaining({
        occurredFrom: '2026-05-17T16:00:00.000Z',
        occurredTo: '2026-05-24T15:59:59.999Z',
      }),
    );
  });

  it('caps recent transaction tool results', async () => {
    transactionsService.listTransactions.mockResolvedValue([]);

    await service.execute('user_1', 'ledger_1', 'Asia/Shanghai', new Date('2026-05-23T12:00:00.000Z'), {
      name: 'recent_transactions',
      arguments: { limit: 99 },
    });

    expect(transactionsService.listTransactions).toHaveBeenCalledWith(
      'user_1',
      'ledger_1',
      expect.objectContaining({ limit: 10, offset: 0 }),
    );
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai-insight-tools.service.spec.ts
```

Expected: fails because the service does not exist.

- [ ] **Step 2: Create tool service**

Create `apps/api/src/ai/ai-insight-tools.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { AiInsightToolCall } from '@bookkeeping/shared-types';
import { StatisticsService } from '../statistics/statistics.service';
import { TransactionsService } from '../transactions/transactions.service';
import type { InternalAiInsightToolResult } from './ai.types';

@Injectable()
export class AiInsightToolsService {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async execute(
    userId: string,
    ledgerId: string,
    timezone: string,
    now: Date,
    call: AiInsightToolCall,
  ): Promise<InternalAiInsightToolResult> {
    const range = resolveDateRange(call.arguments, timezone, now);
    if (call.name === 'monthly_summary') {
      return {
        toolName: call.name,
        data: await this.statisticsService.getMonthlySummary(userId, ledgerId, range),
      };
    }
    if (call.name === 'category_breakdown') {
      return {
        toolName: call.name,
        data: await this.statisticsService.getCategoryBreakdown(userId, ledgerId, {
          ...range,
          type: call.arguments.type ?? 'expense',
        }),
      };
    }
    if (call.name === 'account_balances') {
      return {
        toolName: call.name,
        data: await this.statisticsService.getAccountBalances(userId, ledgerId),
      };
    }
    if (call.name === 'member_expenses') {
      return {
        toolName: call.name,
        data: await this.statisticsService.getMemberExpenses(userId, ledgerId, range),
      };
    }
    return {
      toolName: call.name,
      data: {
        items: await this.transactionsService.listTransactions(userId, ledgerId, {
          ...range,
          limit: Math.min(call.arguments.limit ?? 5, 10),
          offset: 0,
        }),
      },
    };
  }
}

function resolveDateRange(
  args: AiInsightToolCall['arguments'],
  timezone: string,
  now: Date,
): { occurredFrom?: string; occurredTo?: string } {
  if (args.occurredFrom || args.occurredTo) {
    return { occurredFrom: args.occurredFrom, occurredTo: args.occurredTo };
  }
  const local = getLocalParts(now, timezone);
  if (args.period === 'last_month') {
    const month = local.month === 1 ? 12 : local.month - 1;
    const year = local.month === 1 ? local.year - 1 : local.year;
    return monthRangeUtc(year, month, timezone);
  }
  if (args.period === 'this_month') {
    return monthRangeUtc(local.year, local.month, timezone);
  }
  return weekRangeUtc(local.year, local.month, local.day, timezone);
}

function getLocalParts(date: Date, timezone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function monthRangeUtc(year: number, month: number, timezone: string): { occurredFrom: string; occurredTo: string } {
  const start = zonedLocalToUtc(year, month, 1, 0, 0, 0, 0, timezone);
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const next = zonedLocalToUtc(endYear, endMonth, 1, 0, 0, 0, 0, timezone);
  return { occurredFrom: start.toISOString(), occurredTo: new Date(next.getTime() - 1).toISOString() };
}

function weekRangeUtc(year: number, month: number, day: number, timezone: string): { occurredFrom: string; occurredTo: string } {
  const localNoon = zonedLocalToUtc(year, month, day, 12, 0, 0, 0, timezone);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(localNoon);
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const daysSinceMonday = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
  const startNoon = new Date(localNoon.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const startParts = getLocalParts(startNoon, timezone);
  const start = zonedLocalToUtc(startParts.year, startParts.month, startParts.day, 0, 0, 0, 0, timezone);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { occurredFrom: start.toISOString(), occurredTo: end.toISOString() };
}

function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timezone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const offset = getTimezoneOffsetMs(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offset);
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const localAsUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
  return localAsUtc - date.getTime();
}
```

- [ ] **Step 3: Wire module imports and provider**

In `apps/api/src/ai/ai.module.ts`, import `StatisticsModule`, `TransactionsModule`, and provide `AiInsightToolsService`:

```ts
import { StatisticsModule } from '../statistics/statistics.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AiInsightToolsService } from './ai-insight-tools.service';
```

Then ensure:

```ts
imports: [
  ConfigModule,
  TransactionsModule,
  StatisticsModule,
  // keep existing queue/storage imports
],
providers: [
  AiService,
  AiRepository,
  AiInternalClient,
  AiInsightToolsService,
  // keep existing providers
],
```

- [ ] **Step 4: Verify tool tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai-insight-tools.service.spec.ts
```

Expected: all tool tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/ai-insight-tools.service.ts apps/api/src/ai/ai-insight-tools.service.spec.ts apps/api/src/ai/ai.module.ts
git commit -m "feat: add controlled ai insight tools"
```

---

## Task 7: NestJS Repository — Insight Task and Result Mapping

**Files:**
- Modify: `apps/api/src/ai/ai.repository.ts`
- Modify: `apps/api/src/ai/ai.mapper.ts`
- Modify: `apps/api/src/ai/ai.repository.spec.ts`

- [ ] **Step 1: Add failing repository tests**

Append to `apps/api/src/ai/ai.repository.spec.ts`:

```ts
it('creates insight task with sanitized question text', async () => {
  prisma.aiTask.create.mockResolvedValue({
    id: 'task_1',
    ledgerId: 'ledger_1',
    userId: 'user_1',
    type: 'insight',
    status: 'processing',
    inputText: '这周花了多少钱',
    inputFileUrl: null,
    errorMessage: null,
    createdAt: new Date('2026-05-23T12:00:00.000Z'),
    updatedAt: new Date('2026-05-23T12:00:00.000Z'),
    extractions: [],
    insightResult: null,
  });

  await expect(repository.createInsightTask({ ledgerId: 'ledger_1', userId: 'user_1', question: '这周花了多少钱' })).resolves.toMatchObject({
    id: 'task_1',
    type: 'insight',
    status: 'processing',
  });
});

it('saves insight result and maps public detail', async () => {
  prisma.aiInsightResult.create.mockResolvedValue({
    id: 'insight_1',
    aiTaskId: 'task_1',
    ledgerId: 'ledger_1',
    userId: 'user_1',
    intent: 'ledger_insight',
    question: '这周花了多少钱',
    answer: '这段时间支出 350.50。',
    references: [{ toolName: 'monthly_summary', label: '收支汇总', data: { expense: '350.50' } }],
    toolResults: [{ toolName: 'monthly_summary', data: { expense: '350.50' } }],
    rawResult: { provider: 'deterministic-insight' },
    createdAt: new Date('2026-05-23T12:00:00.000Z'),
    updatedAt: new Date('2026-05-23T12:00:00.000Z'),
  });

  await expect(
    repository.createInsightResult({
      aiTaskId: 'task_1',
      ledgerId: 'ledger_1',
      userId: 'user_1',
      intent: 'ledger_insight',
      question: '这周花了多少钱',
      answer: '这段时间支出 350.50。',
      references: [{ toolName: 'monthly_summary', label: '收支汇总', data: { expense: '350.50' } }],
      toolResults: [{ toolName: 'monthly_summary', data: { expense: '350.50' } }],
      rawResult: { provider: 'deterministic-insight' },
    }),
  ).resolves.toMatchObject({
    taskId: 'task_1',
    intent: 'ledger_insight',
    answer: '这段时间支出 350.50。',
  });
});
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.repository.spec.ts
```

Expected: fails because repository methods do not exist.

- [ ] **Step 2: Add mapper for insight results**

In `apps/api/src/ai/ai.mapper.ts`, add:

```ts
import type { AiInsightChatResult, AiInsightReference } from '@bookkeeping/shared-types';

export type AiInsightResultRecord = {
  aiTaskId: string;
  ledgerId: string;
  intent: AiInsightChatResult['intent'];
  answer: string;
  references: unknown;
  createdAt: Date;
};

export function toAiInsightChatResult(record: AiInsightResultRecord): AiInsightChatResult {
  return {
    taskId: record.aiTaskId,
    ledgerId: record.ledgerId,
    status: 'succeeded',
    intent: record.intent,
    answer: record.answer,
    references: Array.isArray(record.references) ? (record.references as AiInsightReference[]) : [],
    suggestedNextAction: suggestedNextActionForIntent(record.intent),
  };
}

function suggestedNextActionForIntent(intent: AiInsightChatResult['intent']): AiInsightChatResult['suggestedNextAction'] {
  if (intent === 'ledger_insight') return 'show_statistics';
  if (intent === 'text_accounting') return 'start_text_accounting';
  if (intent === 'app_help') return 'show_help';
  return 'none';
}
```

- [ ] **Step 3: Add repository methods**

In `apps/api/src/ai/ai.repository.ts`, import mapper and types:

```ts
import { toAiInsightChatResult } from './ai.mapper';
import type { AiInsightResultDetail, CreateAiInsightResultData, InsightContext } from './ai.types';
```

Add methods:

```ts
async createInsightTask(data: { ledgerId: string; userId: string; question: string }): Promise<AiTaskDetail> {
  const task = await this.prisma.aiTask.create({
    data: {
      ledgerId: data.ledgerId,
      userId: data.userId,
      type: 'insight',
      status: 'processing',
      inputText: data.question,
    },
    include: { extractions: true, insightResult: true },
  });
  return toAiTaskDetail(task as AiTaskRecord);
}

async getInsightContext(ledgerId: string): Promise<InsightContext | null> {
  const ledger = await this.prisma.ledger.findFirst({
    where: { id: ledgerId, archivedAt: null },
    select: { timezone: true, defaultCurrency: true },
  });
  return ledger ? { timezone: ledger.timezone, defaultCurrency: ledger.defaultCurrency } : null;
}

async createInsightResult(data: CreateAiInsightResultData): Promise<AiInsightResultDetail> {
  const result = await this.prisma.aiInsightResult.create({
    data: {
      aiTaskId: data.aiTaskId,
      ledgerId: data.ledgerId,
      userId: data.userId,
      intent: data.intent,
      question: data.question,
      answer: data.answer,
      references: data.references as Prisma.InputJsonValue,
      toolResults: data.toolResults as unknown as Prisma.InputJsonValue,
      rawResult: data.rawResult as Prisma.InputJsonValue,
    },
  });
  return toAiInsightChatResult(result);
}
```

When updating `findTaskForUser` and `listTasksForLedgerUser`, include the optional `insightResult` relation and map it into `AiTaskDetail.insight` in `toAiTaskDetail`.

- [ ] **Step 4: Verify repository tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.repository.spec.ts
```

Expected: all repository tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/ai.repository.ts apps/api/src/ai/ai.mapper.ts apps/api/src/ai/ai.repository.spec.ts
git commit -m "feat: persist ai insight results"
```

---

## Task 8: NestJS Service and Controller — Public Chat Endpoint

**Files:**
- Modify: `apps/api/src/ai/ai.service.ts`
- Modify: `apps/api/src/ai/ai.controller.ts`
- Modify: `apps/api/src/ai/ai.service.spec.ts`
- Modify: `apps/api/src/ai/ai.controller.spec.ts`

- [ ] **Step 1: Add failing service test for ledger insight**

Append to `apps/api/src/ai/ai.service.spec.ts`:

```ts
it('answers ledger insight questions using controlled tools', async () => {
  policy.canViewLedger.mockResolvedValue(true);
  repository.createInsightTask.mockResolvedValue({ ...task, id: 'task_1', type: 'insight', status: 'processing' });
  repository.getInsightContext.mockResolvedValue({ timezone: 'Asia/Shanghai', defaultCurrency: 'CNY' });
  internalClient.chatInsight
    .mockResolvedValueOnce({
      taskId: 'task_1',
      intent: 'ledger_insight',
      needsLedgerData: true,
      needsTransactionCreation: false,
      toolCalls: [{ name: 'monthly_summary', arguments: { period: 'this_week' } }],
      answer: null,
      references: [],
      rawResult: { stage: 'tool_selection' },
    })
    .mockResolvedValueOnce({
      taskId: 'task_1',
      intent: 'ledger_insight',
      needsLedgerData: false,
      needsTransactionCreation: false,
      toolCalls: [],
      answer: '这段时间支出 350.50。',
      references: [{ toolName: 'monthly_summary', label: '收支汇总', data: { expense: '350.50' } }],
      rawResult: { stage: 'answer_generation' },
    });
  insightTools.execute.mockResolvedValue({ toolName: 'monthly_summary', data: { expense: '350.50' } });
  repository.createInsightResult.mockResolvedValue({
    taskId: 'task_1',
    ledgerId: 'ledger_1',
    status: 'succeeded',
    intent: 'ledger_insight',
    answer: '这段时间支出 350.50。',
    references: [{ toolName: 'monthly_summary', label: '收支汇总', data: { expense: '350.50' } }],
    suggestedNextAction: 'show_statistics',
  });
  repository.markTaskSucceeded.mockResolvedValue({ ...task, id: 'task_1', type: 'insight', status: 'succeeded' });

  await expect(
    service.chatInsight('user_1', 'ledger_1', { question: '这周花了多少钱', now: '2026-05-23T12:00:00.000Z' }),
  ).resolves.toMatchObject({
    taskId: 'task_1',
    intent: 'ledger_insight',
    answer: '这段时间支出 350.50。',
  });

  expect(policy.canViewLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
  expect(insightTools.execute).toHaveBeenCalledWith(
    'user_1',
    'ledger_1',
    'Asia/Shanghai',
    new Date('2026-05-23T12:00:00.000Z'),
    { name: 'monthly_summary', arguments: { period: 'this_week' } },
  );
});
```

Update the test setup mocks to include:

```ts
createInsightTask: jest.fn(),
getInsightContext: jest.fn(),
createInsightResult: jest.fn(),
```

Extend `internalClient` mock with:

```ts
chatInsight: jest.fn(),
```

Inject `insightTools` into `AiService`:

```ts
const insightTools = { execute: jest.fn() };
```

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.service.spec.ts
```

Expected: fails because `chatInsight` orchestration does not exist.

- [ ] **Step 2: Add service orchestration**

In `apps/api/src/ai/ai.service.ts`, import:

```ts
import type { ChatAiInsightDto } from './dto/chat-ai-insight.dto';
import { AiInsightToolsService } from './ai-insight-tools.service';
import type { AiInsightChatResult, AiInsightToolName } from '@bookkeeping/shared-types';
```

Inject `AiInsightToolsService` in the constructor after `TransactionsService`.

Add method:

```ts
async chatInsight(userId: string, ledgerId: string, dto: ChatAiInsightDto): Promise<AiInsightChatResult> {
  await this.requireViewLedger(userId, ledgerId);
  const question = dto.question.trim();
  const task = await this.aiRepository.createInsightTask({ ledgerId, userId, question });
  const context = await this.aiRepository.getInsightContext(ledgerId);
  if (!context) {
    await this.aiRepository.markTaskFailed(task.id, 'Ledger context not found');
    throw new NotFoundException(fail('LEDGER_NOT_FOUND', 'Ledger not found'));
  }

  const baseRequest = {
    taskId: task.id,
    ledgerId,
    userId,
    question,
    locale: dto.locale ?? 'zh-CN',
    timezone: dto.timezone ?? context.timezone,
    defaultCurrency: dto.defaultCurrency ?? context.defaultCurrency,
    availableTools: allowedInsightTools(),
  };

  try {
    const first = await this.aiInternalClient.chatInsight({ ...baseRequest, toolResults: [] });
    if (first.needsTransactionCreation || first.intent === 'text_accounting') {
      const answer = first.answer ?? '这看起来是记账录入，请使用文本记账候选确认流程。';
      const result = await this.aiRepository.createInsightResult({
        aiTaskId: task.id,
        ledgerId,
        userId,
        intent: 'text_accounting',
        question,
        answer,
        references: [],
        toolResults: [],
        rawResult: first.rawResult,
      });
      await this.aiRepository.markTaskSucceeded(task.id);
      return result;
    }

    if (!first.needsLedgerData) {
      const result = await this.aiRepository.createInsightResult({
        aiTaskId: task.id,
        ledgerId,
        userId,
        intent: first.intent,
        question,
        answer: first.answer ?? '',
        references: first.references,
        toolResults: [],
        rawResult: first.rawResult,
      });
      await this.aiRepository.markTaskSucceeded(task.id);
      return result;
    }

    const now = dto.now ? new Date(dto.now) : new Date();
    const toolResults = await Promise.all(
      first.toolCalls.map((call) => this.insightToolsService.execute(userId, ledgerId, baseRequest.timezone, now, call)),
    );
    const second = await this.aiInternalClient.chatInsight({ ...baseRequest, toolResults });
    const result = await this.aiRepository.createInsightResult({
      aiTaskId: task.id,
      ledgerId,
      userId,
      intent: second.intent,
      question,
      answer: second.answer ?? '我已根据可见账本数据完成查询。',
      references: second.references,
      toolResults,
      rawResult: second.rawResult,
    });
    await this.aiRepository.markTaskSucceeded(task.id);
    return result;
  } catch {
    await this.aiRepository.markTaskFailed(task.id, 'AI insight task failed');
    throw aiTaskFailed();
  }
}
```

Add helper:

```ts
function allowedInsightTools(): AiInsightToolName[] {
  return ['monthly_summary', 'category_breakdown', 'account_balances', 'member_expenses', 'recent_transactions'];
}
```

- [ ] **Step 3: Add controller route**

In `apps/api/src/ai/ai.controller.ts`, import `ChatAiInsightDto` and add:

```ts
@Post('ledgers/:ledgerId/ai/insights/chat')
async chatInsight(
  @CurrentUser() user: AuthenticatedUser,
  @Param('ledgerId') ledgerId: string,
  @Body() dto: ChatAiInsightDto,
) {
  return ok(await this.aiService.chatInsight(user.id, ledgerId, dto));
}
```

Update `apps/api/src/ai/ai.controller.spec.ts` service mock with `chatInsight`, then add:

```ts
it('exposes ai insight chat route', async () => {
  aiService.chatInsight.mockResolvedValue({
    taskId: 'task_1',
    ledgerId: 'ledger_1',
    status: 'succeeded',
    intent: 'ledger_insight',
    answer: '这段时间支出 350.50。',
    references: [],
    suggestedNextAction: 'show_statistics',
  });

  await expect(
    controller.chatInsight(
      { id: 'user_1', email: 'lineo@example.com' },
      'ledger_1',
      { question: '这周花了多少钱' },
    ),
  ).resolves.toMatchObject({
    success: true,
    data: { taskId: 'task_1', intent: 'ledger_insight' },
  });

  expect(aiService.chatInsight).toHaveBeenCalledWith('user_1', 'ledger_1', { question: '这周花了多少钱' });
});
```

- [ ] **Step 4: Verify service and controller tests**

Run:

```bash
pnpm --filter @bookkeeping/api test -- ai.service.spec.ts ai.controller.spec.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/ai.service.ts apps/api/src/ai/ai.controller.ts apps/api/src/ai/ai.service.spec.ts apps/api/src/ai/ai.controller.spec.ts
git commit -m "feat: add ai insight chat endpoint"
```

---

## Task 9: API Client — Frontend Access Through NestJS Only

**Files:**
- Modify: `packages/api-client/src/index.ts`
- Add or modify: `packages/api-client/src/index.test.ts`

- [ ] **Step 1: Add failing api-client test**

If `packages/api-client/src/index.test.ts` exists, append this test. If it does not exist, create it with the existing package test style:

```ts
import { BookkeepingApiClient } from './index';

it('posts ai insight chat to the NestJS ledger endpoint', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: {
          taskId: 'task_1',
          ledgerId: 'ledger_1',
          status: 'succeeded',
          intent: 'ledger_insight',
          answer: '这段时间支出 350.50。',
          references: [],
          suggestedNextAction: 'show_statistics',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  const client = new BookkeepingApiClient({ baseUrl: '/api', fetch: fetchMock as unknown as typeof fetch });

  await expect(client.chatAiInsight('ledger_1', { question: '这周花了多少钱' })).resolves.toMatchObject({
    success: true,
    data: { taskId: 'task_1', intent: 'ledger_insight' },
  });
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/ledgers/ledger_1/ai/insights/chat',
    expect.objectContaining({ method: 'POST' }),
  );
});
```

Run:

```bash
pnpm --filter @bookkeeping/api-client test
```

Expected: fails because `chatAiInsight` does not exist.

- [ ] **Step 2: Add request method and request type**

In `packages/api-client/src/index.ts`, import:

```ts
import type { AiInsightChatResult } from '@bookkeeping/shared-types';
```

Add request interface near other AI request interfaces:

```ts
export interface AiInsightChatRequest {
  question: string;
  locale?: string;
  timezone?: string;
  defaultCurrency?: string;
  now?: string;
}
```

Add method in `BookkeepingApiClient` after `receiptOcr`:

```ts
chatAiInsight(
  ledgerId: string,
  body: AiInsightChatRequest,
): Promise<ApiResponse<AiInsightChatResult>> {
  return this.request<AiInsightChatResult>(
    `/ledgers/${encodeURIComponent(ledgerId)}/ai/insights/chat`,
    {
      method: 'POST',
      body,
    },
  );
}
```

- [ ] **Step 3: Verify client tests and build**

Run:

```bash
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/api-client build
```

Expected: tests and build pass.

- [ ] **Step 4: Commit**

```bash
git add packages/api-client/src/index.ts packages/api-client/src/index.test.ts
git commit -m "feat: add ai insight api client method"
```

---

## Task 10: Local E2E Script

**Files:**
- Create: `scripts/e2e-m6-ai-insights.sh`
- Modify: `package.json`

- [ ] **Step 1: Create E2E script**

Create `scripts/e2e-m6-ai-insights.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000/api}"
EMAIL="${E2E_EMAIL:-m6-ai-insights@example.com}"
PASSWORD="${E2E_PASSWORD:-Password123!}"

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$API_BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ACCESS_TOKEN:-}" \
      --data "$body"
  else
    curl -sS -X "$method" "$API_BASE_URL$path" \
      -H "Authorization: Bearer ${ACCESS_TOKEN:-}"
  fi
}

echo "Registering or logging in test user..."
REGISTER_RESPONSE="$(curl -sS -X POST "$API_BASE_URL/auth/register" -H "Content-Type: application/json" --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"nickname\":\"M6 Tester\"}")"
LOGIN_RESPONSE="$(curl -sS -X POST "$API_BASE_URL/auth/login" -H "Content-Type: application/json" --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
ACCESS_TOKEN="$(node -e 'const body=JSON.parse(process.argv[1]); if(!body.success) process.exit(1); console.log(body.data.accessToken)' "$LOGIN_RESPONSE")"

LEDGER_RESPONSE="$(request POST /ledgers '{"name":"M6 Insight Ledger","type":"personal","defaultCurrency":"CNY","timezone":"Asia/Shanghai"}')"
LEDGER_ID="$(node -e 'const body=JSON.parse(process.argv[1]); if(!body.success) process.exit(1); console.log(body.data.id)' "$LEDGER_RESPONSE")"

ACCOUNT_RESPONSE="$(request POST "/ledgers/$LEDGER_ID/accounts" '{"name":"现金","type":"cash","currency":"CNY","initialBalance":"1000.00","visibility":"ledger"}')"
ACCOUNT_ID="$(node -e 'const body=JSON.parse(process.argv[1]); if(!body.success) process.exit(1); console.log(body.data.id)' "$ACCOUNT_RESPONSE")"

CATEGORY_RESPONSE="$(request POST "/ledgers/$LEDGER_ID/categories" '{"type":"expense","name":"餐饮","sortOrder":1}')"
CATEGORY_ID="$(node -e 'const body=JSON.parse(process.argv[1]); if(!body.success) process.exit(1); console.log(body.data.id)' "$CATEGORY_RESPONSE")"

request POST "/ledgers/$LEDGER_ID/transactions" "{\"accountId\":\"$ACCOUNT_ID\",\"categoryId\":\"$CATEGORY_ID\",\"type\":\"expense\",\"amount\":\"86.00\",\"currency\":\"CNY\",\"occurredAt\":\"2026-05-23T04:00:00.000Z\",\"merchant\":\"食堂\",\"note\":\"午饭\",\"visibility\":\"ledger\"}" >/dev/null

INSIGHT_RESPONSE="$(request POST "/ledgers/$LEDGER_ID/ai/insights/chat" '{"question":"这周花了多少钱，主要花在哪","now":"2026-05-23T12:00:00.000Z"}')"
node -e '
const body = JSON.parse(process.argv[1]);
if (!body.success) throw new Error(JSON.stringify(body.error));
if (body.data.intent !== "ledger_insight") throw new Error("intent mismatch");
if (!body.data.answer.includes("86.00")) throw new Error(`answer does not contain queried amount: ${body.data.answer}`);
console.log("M6 AI insight E2E passed:", body.data.answer);
' "$INSIGHT_RESPONSE"
```

- [ ] **Step 2: Make executable and add package script**

Run:

```bash
chmod +x scripts/e2e-m6-ai-insights.sh
```

In root `package.json`, add:

```json
"e2e:m6:ai-insights": "bash scripts/e2e-m6-ai-insights.sh"
```

- [ ] **Step 3: Run local E2E with services started**

Start PostgreSQL, NestJS API, and FastAPI, then run:

```bash
pnpm e2e:m6:ai-insights
```

Expected: script prints `M6 AI insight E2E passed:` and the answer contains the real seeded amount `86.00`.

- [ ] **Step 4: Commit**

```bash
git add scripts/e2e-m6-ai-insights.sh package.json
git commit -m "test: add m6 ai insight e2e script"
```

---

## Task 11: Documentation and Context Sync

**Files:**
- Modify: `docs/modules/ai/AI财务问答与洞察规划.md`
- Modify: `docs/modules/ai-service/AI服务规范.md`
- Modify: `docs/modules/api/NestJS服务说明.md`
- Modify: `docs/modules/shared-packages/共享包说明.md`
- Modify: `docs/api/接口规范.md`
- Modify: `.agents/project-context.md`
- Modify: `AGENTS.md`
- Modify: `docs/handover/开发交接说明.md`

- [ ] **Step 1: Update M6 module doc**

Rewrite `docs/modules/ai/AI财务问答与洞察规划.md` so it contains:

````md
# AI 财务问答与洞察说明

## 功能目标

M6 提供账本内自然语言财务问答。用户通过 `POST /ledgers/:ledgerId/ai/insights/chat` 提问，NestJS 校验账本权限，FastAPI 进行 intent 分类和答复组织，所有金额、分类占比、账户余额、成员消费和流水样本均来自 NestJS 受控工具查询。

## 业务规则

- 前端、后台 Web、移动端和 `@bookkeeping/api-client` 只能调用 NestJS 对外 API。
- FastAPI 不访问数据库，不判断账本权限，不创建正式流水。
- `ledger_insight` 必须通过 NestJS 工具查询真实数据。
- `text_accounting` 只返回进入 M4 文本记账流程的建议，不直接创建流水。
- `app_help`、`general_knowledge` 和 `unsupported` 不调用账本数据工具。
- 私密流水仅创建者可见，私密账户仅 owner 可见；M6 工具复用现有统计和流水可见性规则。

## 数据模型

- `ai_tasks.type = insight` 记录问答任务。
- `ai_insight_results` 保存 `intent`、脱敏问题、答复、引用数据、工具结果和模型原始摘要。
- M6 不写入 `ai_extractions`，因为问答答复不是待确认流水候选。

## 接口说明

`POST /ledgers/:ledgerId/ai/insights/chat`

请求体：

```json
{
  "question": "这周花了多少钱，主要花在哪",
  "locale": "zh-CN",
  "now": "2026-05-23T12:00:00.000Z"
}
```

响应体：

```json
{
  "taskId": "task_id",
  "ledgerId": "ledger_id",
  "status": "succeeded",
  "intent": "ledger_insight",
  "answer": "这段时间支出 86.00，主要支出分类是餐饮。",
  "references": [],
  "suggestedNextAction": "show_statistics"
}
```

## 验证方式

```bash
cd apps/ai-service && uv run pytest
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/shared-types build
pnpm e2e:m6:ai-insights
git diff --check
```
````

- [ ] **Step 2: Update adjacent docs**

Add M6 status and verification command references to:

```md
docs/modules/ai-service/AI服务规范.md
docs/modules/api/NestJS服务说明.md
docs/modules/shared-packages/共享包说明.md
docs/api/接口规范.md
.agents/project-context.md
AGENTS.md
docs/handover/开发交接说明.md
```

Use this exact boundary statement in each place where M6 is summarized:

```md
M6 AI 财务问答与洞察已通过 NestJS `POST /ledgers/:ledgerId/ai/insights/chat` 打通首版闭环；FastAPI 只做 intent 分类、工具选择和答复组织，所有账本金额和统计结论来自 NestJS 受控工具查询。
```

- [ ] **Step 3: Verify docs whitespace**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 4: Commit**

```bash
git add docs/modules/ai/AI财务问答与洞察规划.md docs/modules/ai-service/AI服务规范.md docs/modules/api/NestJS服务说明.md docs/modules/shared-packages/共享包说明.md docs/api/接口规范.md .agents/project-context.md AGENTS.md docs/handover/开发交接说明.md
git commit -m "docs: document m6 ai financial insights"
```

---

## Task 12: Final Verification

**Files:**
- No source edits unless a verification command exposes a defect.

- [ ] **Step 1: Run FastAPI tests**

```bash
cd apps/ai-service && uv run pytest
```

Expected: all tests pass.

- [ ] **Step 2: Run NestJS tests and typecheck**

```bash
pnpm --filter @bookkeeping/api test
pnpm --filter @bookkeeping/api typecheck
```

Expected: all API tests and typecheck pass.

- [ ] **Step 3: Run shared package and client verification**

```bash
pnpm --filter @bookkeeping/shared-types build
pnpm --filter @bookkeeping/api-client test
pnpm --filter @bookkeeping/api-client build
```

Expected: all commands pass.

- [ ] **Step 4: Run local E2E**

With PostgreSQL, NestJS API, and FastAPI running:

```bash
pnpm e2e:m6:ai-insights
```

Expected: output includes `M6 AI insight E2E passed:` and the answer contains the seeded amount.

- [ ] **Step 5: Run workspace light verification**

```bash
pnpm verify:workspace-light
git status --short --branch
```

Expected: verification passes; status contains only intentional M6 files before final integration or is clean after commits.

- [ ] **Step 6: Commit remaining verification fixes**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix: stabilize m6 ai insight verification"
```

---

## Self-Review

- Spec coverage: covers M6 intent routing, NestJS-only public API, FastAPI internal-only role, controlled ledger tools, task persistence, references, shared types, client method, E2E, and Chinese docs.
- Privacy boundary: all ledger data tools execute inside NestJS through existing statistics and transaction services, so private transaction/account filtering remains server-side.
- Scope: excludes mobile UI and real LLM provider selection; the deterministic FastAPI route establishes the stable internal contract for a later provider swap.
- Placeholder scan: no placeholder markers or unspecified implementation steps are intentionally left in this plan.
- Verification: every implementation task has a focused test command and final package-level verification.
