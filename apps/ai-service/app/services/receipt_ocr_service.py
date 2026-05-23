import re
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from app.providers.ocr_provider import OcrProvider
from app.providers.tesseract_provider import TesseractProvider
from app.schemas.receipt_ocr import (
    OcrCandidate,
    OcrError,
    OcrRawResult,
    ReceiptInfo,
    ReceiptItem,
    ReceiptOcrRequest,
    ReceiptOcrResponse,
)

AMOUNT_PATTERN = re.compile(r"[¥￥]?\s*(\d+(?:\.\d{1,2})?)")
TOTAL_KEYWORDS = ("合计", "总计", "总额", "应付", "实付", "实收")
MERCHANT_KEYWORDS = ("店", "餐厅", "超市", "公司", "商场", "药房", "医院")
DATE_PATTERN = re.compile(r"(\d{4})[年/\-.](\d{1,2})[月/\-.](\d{1,2})")
ITEM_PATTERN = re.compile(r"(.+?)\s+[xX×]?\s*(\d+)\s+[¥￥]?\s*(\d+(?:\.\d{1,2})?)")


_ocr_provider: OcrProvider | None = None


def get_ocr_provider() -> OcrProvider:
    global _ocr_provider
    if _ocr_provider is None:
        _ocr_provider = TesseractProvider()
    return _ocr_provider


async def download_image(signed_url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(signed_url)
        response.raise_for_status()
        return response.content


async def parse_receipt(request: ReceiptOcrRequest) -> ReceiptOcrResponse:
    try:
        image_bytes = await download_image(request.file.signed_url)
    except Exception:
        return _failed_response(request.task_id, "AI_OCR_FAILED", "无法获取票据图片")

    provider = get_ocr_provider()
    text_blocks = await provider.extract_text(image_bytes, request.file.mime_type)

    if not text_blocks:
        return _failed_response(request.task_id, "AI_OCR_FAILED", "未能识别票据内容")

    full_text = "\n".join(text_blocks)
    amount = _extract_total_amount(text_blocks)
    merchant = _extract_merchant(text_blocks)
    occurred_at = _extract_date(full_text, request.timezone)
    items = _extract_items(text_blocks)
    category_name = _match_category(full_text, request.context.category_names)
    account_hint = _match_first(full_text, request.context.account_hints)

    if amount is None:
        return _failed_response(request.task_id, "AI_OCR_AMOUNT_NOT_FOUND", "未能识别票据金额")

    confidence = 0.80
    if amount != "0.00":
        confidence += 0.05
    if merchant:
        confidence += 0.05
    if items:
        confidence += 0.05

    missing_fields: list[str] = []
    if not category_name:
        missing_fields.append("categoryId")
    if not account_hint:
        missing_fields.append("accountId")

    return ReceiptOcrResponse(
        taskId=request.task_id,
        status="succeeded",
        candidate=OcrCandidate(
            type="expense",
            amount=amount,
            currency=request.default_currency.upper(),
            occurredAt=occurred_at,
            categoryName=category_name,
            accountHint=account_hint,
            merchant=merchant,
            note="票据识别候选",
            confidence=round(confidence, 2),
            missingFields=missing_fields,
            reviewMessage=_build_review_message(missing_fields),
            receipt=ReceiptInfo(items=items) if items else None,
        ),
        rawResult=OcrRawResult(
            provider="tesseract",
            model="chi_sim+eng",
            textBlocks=text_blocks,
        ),
    )


def _extract_total_amount(text_blocks: list[str]) -> str | None:
    for line in reversed(text_blocks):
        if any(kw in line for kw in TOTAL_KEYWORDS):
            match = AMOUNT_PATTERN.search(line)
            if match:
                return _normalize_amount(match.group(1))

    all_amounts: list[str] = []
    for line in text_blocks:
        for m in AMOUNT_PATTERN.finditer(line):
            normalized = _normalize_amount(m.group(1))
            if normalized:
                all_amounts.append(normalized)

    if all_amounts:
        return max(all_amounts, key=lambda x: Decimal(x))
    return None


def _normalize_amount(raw: str) -> str | None:
    try:
        amount = Decimal(raw)
    except InvalidOperation:
        return None
    if amount <= 0:
        return None
    return str(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _extract_merchant(text_blocks: list[str]) -> str | None:
    for line in text_blocks[:5]:
        if any(kw in line for kw in MERCHANT_KEYWORDS):
            return line.strip()
    if text_blocks:
        first = text_blocks[0].strip()
        if len(first) >= 2 and len(first) <= 30:
            return first
    return None


def _extract_date(full_text: str, timezone: str) -> str:
    match = DATE_PATTERN.search(full_text)
    if match:
        try:
            year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
            try:
                tzinfo = ZoneInfo(timezone)
            except ZoneInfoNotFoundError:
                tzinfo = ZoneInfo("UTC")
            dt = datetime(year, month, day, 12, 0, 0, tzinfo=tzinfo)
            return dt.isoformat()
        except ValueError:
            pass

    try:
        tzinfo = ZoneInfo(timezone)
    except ZoneInfoNotFoundError:
        tzinfo = ZoneInfo("UTC")
    return datetime.now(tzinfo).isoformat()


def _extract_items(text_blocks: list[str]) -> list[ReceiptItem]:
    items: list[ReceiptItem] = []
    for line in text_blocks:
        match = ITEM_PATTERN.search(line)
        if match:
            name = match.group(1).strip()
            quantity = match.group(2)
            amount_str = _normalize_amount(match.group(3))
            if name and amount_str:
                items.append(ReceiptItem(name=name, quantity=quantity, unitPrice=amount_str, amount=amount_str))
    return items


def _match_first(text: str, candidates: list[str]) -> str | None:
    for c in candidates:
        if c and c in text:
            return c
    return None


def _match_category(text: str, candidates: list[str]) -> str | None:
    direct = _match_first(text, candidates)
    if direct:
        return direct
    meal_keywords = ("餐", "饭", "外卖", "奶茶", "咖啡", "早餐", "午餐", "晚餐", "宵夜")
    if any(kw in text for kw in meal_keywords):
        return _match_first("餐饮", candidates)
    return None


def _build_review_message(missing_fields: list[str]) -> str | None:
    if not missing_fields:
        return None
    if missing_fields == ["categoryId"]:
        return "请补充分类后再确认"
    if missing_fields == ["accountId"]:
        return "请补充账户后再确认"
    return "请补充分类和账户后再确认"


def _failed_response(task_id: str, code: str, message: str) -> ReceiptOcrResponse:
    return ReceiptOcrResponse(
        taskId=task_id,
        status="failed",
        candidate=None,
        rawResult=None,
        error=OcrError(code=code, message=message, retryable=False),
    )
