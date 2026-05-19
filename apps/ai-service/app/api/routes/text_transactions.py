from fastapi import APIRouter

from app.schemas.text_transactions import TextTransactionRequest, TextTransactionResponse
from app.services.text_transaction_parser import parse_text_transaction


router = APIRouter(prefix="/internal/ai", tags=["internal-ai"])


@router.post("/text-transaction")
async def parse_text_transaction_endpoint(
    request: TextTransactionRequest,
) -> TextTransactionResponse:
    return parse_text_transaction(request)
