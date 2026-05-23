from fastapi import FastAPI

from app.api.routes.text_transactions import router as text_transactions_router
from app.api.routes.receipt_ocr import router as receipt_ocr_router

app = FastAPI(title="Bookkeeping AI Service")
app.include_router(text_transactions_router)
app.include_router(receipt_ocr_router)
