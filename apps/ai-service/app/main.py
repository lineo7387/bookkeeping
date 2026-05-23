from fastapi import FastAPI

from app.api.routes.text_transactions import router as text_transactions_router


app = FastAPI(title="Bookkeeping AI Service")
app.include_router(text_transactions_router)
