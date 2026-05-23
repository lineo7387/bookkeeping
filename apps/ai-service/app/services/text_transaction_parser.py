from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.schemas.text_transactions import (
    TextTransactionCandidate,
    TextTransactionError,
    TextTransactionRawResult,
    TextTransactionRequest,
    TextTransactionResponse,
)


AMOUNT_PATTERN = re.compile(r"(?<!\d)(\d+(?:\.\d{1,2})?)(?!\d)")


def parse_text_transaction(request: TextTransactionRequest) -> TextTransactionResponse:
    amount = extract_amount(request.input_text)

    if amount is None:
        return TextTransactionResponse(
            taskId=request.task_id,
            status="failed",
            candidate=None,
            rawResult=TextTransactionRawResult(
                provider="deterministic-parser",
                model="rules-v1",
                reason="no amount detected",
            ),
            error=TextTransactionError(
                code="AI_PARSE_FAILED",
                message="Unable to parse candidate transaction",
                retryable=False,
            ),
        )

    category_name = match_category_name(request.input_text, request.context.category_names)
    account_hint = first_substring_match(request.input_text, request.context.account_hints)
    missing_fields = build_missing_fields(category_name, account_hint)

    confidence = 0.91
    if category_name is None:
        confidence -= 0.08
    if account_hint is None:
        confidence -= 0.05
    reason = "parsed amount and matched context hints"
    if missing_fields:
        reason = "parsed amount with missing confirmation fields"

    return TextTransactionResponse(
        taskId=request.task_id,
        status="succeeded",
        candidate=TextTransactionCandidate(
            type=infer_transaction_type(request.input_text),
            amount=amount,
            currency=request.default_currency.upper(),
            occurredAt=current_iso_time(request.timezone),
            categoryName=category_name,
            accountHint=account_hint,
            merchant=None,
            note=request.input_text,
            confidence=round(confidence, 2),
            missingFields=missing_fields,
            reviewMessage=build_review_message(missing_fields),
        ),
        rawResult=TextTransactionRawResult(
            provider="deterministic-parser",
            model="rules-v1",
            reason=reason,
        ),
        error=None,
    )


def extract_amount(input_text: str) -> str | None:
    match = AMOUNT_PATTERN.search(input_text)
    if match is None:
        return None

    try:
        amount = Decimal(match.group(1))
    except InvalidOperation:
        return None

    if amount <= 0:
        return None

    return str(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def infer_transaction_type(input_text: str) -> str:
    if "收入" in input_text or "工资" in input_text:
        return "income"
    return "expense"


def first_substring_match(input_text: str, candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate and candidate in input_text:
            return candidate
    return None


def match_category_name(input_text: str, candidates: list[str]) -> str | None:
    direct_match = first_substring_match(input_text, candidates)
    if direct_match is not None:
        return direct_match

    meal_keywords = ("饭", "早餐", "午餐", "晚餐", "宵夜", "餐厅", "外卖", "奶茶", "咖啡")
    if any(keyword in input_text for keyword in meal_keywords):
        return first_substring_match("餐饮", candidates)

    return None


def build_missing_fields(category_name: str | None, account_hint: str | None) -> list[str]:
    missing_fields: list[str] = []
    if category_name is None:
        missing_fields.append("categoryId")
    if account_hint is None:
        missing_fields.append("accountId")
    return missing_fields


def build_review_message(missing_fields: list[str]) -> str | None:
    if not missing_fields:
        return None
    if missing_fields == ["categoryId"]:
        return "请补充分类后再确认"
    if missing_fields == ["accountId"]:
        return "请补充账户后再确认"
    return "请补充分类和账户后再确认"


def current_iso_time(timezone: str) -> str:
    try:
        tzinfo = ZoneInfo(timezone)
    except ZoneInfoNotFoundError:
        tzinfo = ZoneInfo("UTC")

    return datetime.now(tzinfo).isoformat()
