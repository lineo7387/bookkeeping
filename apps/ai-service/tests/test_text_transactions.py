from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_text_transaction_success_returns_candidate():
    response = client.post(
        "/internal/ai/text-transaction",
        json={
            "taskId": "task_1",
            "ledgerId": "ledger_1",
            "userId": "user_1",
            "inputText": "今天晚饭花了86，微信支付",
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "defaultCurrency": "CNY",
            "context": {"categoryNames": ["餐饮"], "accountHints": ["微信"]},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["taskId"] == "task_1"
    assert body["status"] == "succeeded"
    assert body["candidate"]["type"] == "expense"
    assert body["candidate"]["amount"] == "86.00"
    assert body["candidate"]["currency"] == "CNY"
    assert body["candidate"]["categoryName"] == "餐饮"
    assert body["candidate"]["accountHint"] == "微信"
    assert body["candidate"]["note"] == "今天晚饭花了86，微信支付"
    assert body["rawResult"]["provider"] == "deterministic-parser"


def test_text_transaction_empty_input_returns_422():
    response = client.post(
        "/internal/ai/text-transaction",
        json={
            "taskId": "task_1",
            "ledgerId": "ledger_1",
            "userId": "user_1",
            "inputText": "",
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "defaultCurrency": "CNY",
            "context": {"categoryNames": [], "accountHints": []},
        },
    )

    assert response.status_code == 422


def test_text_transaction_unparseable_returns_failed_status():
    response = client.post(
        "/internal/ai/text-transaction",
        json={
            "taskId": "task_1",
            "ledgerId": "ledger_1",
            "userId": "user_1",
            "inputText": "只是随便记一句",
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "defaultCurrency": "CNY",
            "context": {"categoryNames": [], "accountHints": []},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["taskId"] == "task_1"
    assert body["status"] == "failed"
    assert body["candidate"] is None
    assert body["error"]["code"] == "AI_PARSE_FAILED"


def test_text_transaction_low_confidence_returns_review_hints():
    response = client.post(
        "/internal/ai/text-transaction",
        json={
            "taskId": "task_1",
            "ledgerId": "ledger_1",
            "userId": "user_1",
            "inputText": "买东西86",
            "locale": "zh-CN",
            "timezone": "Asia/Shanghai",
            "defaultCurrency": "CNY",
            "context": {"categoryNames": ["餐饮"], "accountHints": ["微信"]},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "succeeded"
    assert body["candidate"]["confidence"] < 0.8
    assert body["candidate"]["missingFields"] == ["categoryId", "accountId"]
    assert body["candidate"]["reviewMessage"] == "请补充分类和账户后再确认"
    assert body["rawResult"]["reason"] == "parsed amount with missing confirmation fields"
