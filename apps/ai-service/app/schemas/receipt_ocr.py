from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OcrFileInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    storage_key: str = Field(alias="storageKey")
    signed_url: str = Field(alias="signedUrl")
    mime_type: str = Field(alias="mimeType")


class OcrContext(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category_names: list[str] = Field(default_factory=list, alias="categoryNames")
    account_hints: list[str] = Field(default_factory=list, alias="accountHints")


class ReceiptOcrRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(min_length=1, alias="taskId")
    ledger_id: str = Field(min_length=1, alias="ledgerId")
    user_id: str = Field(min_length=1, alias="userId")
    file: OcrFileInfo
    locale: str = "zh-CN"
    timezone: str = "Asia/Shanghai"
    default_currency: str = Field(default="CNY", min_length=3, max_length=3, alias="defaultCurrency")
    context: OcrContext = Field(default_factory=OcrContext)


class ReceiptItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    quantity: str | None = None
    unit_price: str | None = Field(default=None, alias="unitPrice")
    amount: str


class ReceiptInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    invoice_no: str | None = Field(default=None, alias="invoiceNo")
    tax_no: str | None = Field(default=None, alias="taxNo")
    items: list[ReceiptItem] = Field(default_factory=list)


class OcrCandidate(BaseModel):
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
    missing_fields: list[Literal["accountId", "categoryId"]] = Field(
        default_factory=list, alias="missingFields"
    )
    review_message: str | None = Field(default=None, alias="reviewMessage")
    receipt: ReceiptInfo | None = None


class OcrRawResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    provider: str
    model: str
    text_blocks: list[str] = Field(default_factory=list, alias="textBlocks")


class OcrError(BaseModel):
    code: str
    message: str
    retryable: bool


class ReceiptOcrResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(alias="taskId")
    status: Literal["succeeded", "failed"]
    candidate: OcrCandidate | None = None
    raw_result: OcrRawResult | None = Field(default=None, alias="rawResult")
    error: OcrError | None = None
