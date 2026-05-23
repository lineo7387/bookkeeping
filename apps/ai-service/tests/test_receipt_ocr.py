from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    return TestClient(app)


VALID_REQUEST = {
    "taskId": "task-001",
    "ledgerId": "ledger-001",
    "userId": "user-001",
    "file": {
        "storageKey": "receipts/test.jpg",
        "signedUrl": "http://minio:9000/test.jpg",
        "mimeType": "image/jpeg",
    },
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai",
    "defaultCurrency": "CNY",
    "context": {
        "categoryNames": ["餐饮", "交通"],
        "accountHints": ["微信", "支付宝"],
    },
}


def test_receipt_ocr_returns_candidate(client: TestClient):
    mock_image = b"fake-image-bytes"

    with (
        patch("app.services.receipt_ocr_service.download_image", new_callable=AsyncMock, return_value=mock_image),
        patch(
            "app.services.receipt_ocr_service.get_ocr_provider",
            return_value=_mock_provider(["示例餐厅", "套餐 1份 ¥68.00", "合计 ¥68.00"]),
        ),
    ):
        response = client.post("/internal/ai/receipt-ocr", json=VALID_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert body["taskId"] == "task-001"
    assert body["status"] == "succeeded"
    assert body["candidate"] is not None
    assert body["candidate"]["amount"] == "68.00"


def test_receipt_ocr_returns_failed_when_no_text(client: TestClient):
    mock_image = b"fake-image-bytes"

    with (
        patch("app.services.receipt_ocr_service.download_image", new_callable=AsyncMock, return_value=mock_image),
        patch(
            "app.services.receipt_ocr_service.get_ocr_provider",
            return_value=_mock_provider([]),
        ),
    ):
        response = client.post("/internal/ai/receipt-ocr", json=VALID_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "failed"
    assert body["candidate"] is None


def _mock_provider(text_blocks: list[str]):
    provider = AsyncMock()
    provider.extract_text.return_value = text_blocks
    return provider
