from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TextTransactionContext(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category_names: list[str] = Field(default_factory=list, alias="categoryNames")
    account_hints: list[str] = Field(default_factory=list, alias="accountHints")


class TextTransactionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(min_length=1, alias="taskId")
    ledger_id: str = Field(min_length=1, alias="ledgerId")
    user_id: str = Field(min_length=1, alias="userId")
    input_text: str = Field(min_length=1, max_length=500, alias="inputText")
    locale: str = "zh-CN"
    timezone: str = "Asia/Shanghai"
    default_currency: str = Field(default="CNY", min_length=3, max_length=3, alias="defaultCurrency")
    context: TextTransactionContext = Field(default_factory=TextTransactionContext)

    @field_validator("input_text")
    @classmethod
    def input_text_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("inputText must not be blank")
        return stripped


class TextTransactionCandidate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["income", "expense"]
    amount: str
    currency: str
    occurred_at: str = Field(alias="occurredAt")
    category_name: str | None = Field(default=None, alias="categoryName")
    account_hint: str | None = Field(default=None, alias="accountHint")
    merchant: str | None = None
    note: str | None = None
    confidence: float = Field(ge=0, le=1)
    missing_fields: list[Literal["accountId", "categoryId"]] = Field(default_factory=list, alias="missingFields")
    review_message: str | None = Field(default=None, alias="reviewMessage")


class TextTransactionRawResult(BaseModel):
    provider: str
    model: str
    reason: str


class TextTransactionError(BaseModel):
    code: str
    message: str
    retryable: bool


class TextTransactionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(alias="taskId")
    status: Literal["succeeded", "failed"]
    candidate: TextTransactionCandidate | None = None
    raw_result: TextTransactionRawResult | None = Field(default=None, alias="rawResult")
    error: TextTransactionError | None = None
