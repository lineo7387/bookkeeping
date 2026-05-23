from fastapi import APIRouter

from app.schemas.receipt_ocr import ReceiptOcrRequest, ReceiptOcrResponse
from app.services.receipt_ocr_service import parse_receipt

router = APIRouter()


@router.post(
    "/internal/ai/receipt-ocr",
    response_model=ReceiptOcrResponse,
    response_model_by_alias=True,
)
async def receipt_ocr(request: ReceiptOcrRequest) -> ReceiptOcrResponse:
    return await parse_receipt(request)
