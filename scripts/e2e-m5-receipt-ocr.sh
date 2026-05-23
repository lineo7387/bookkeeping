#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000/api}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_IMAGE="${SCRIPT_DIR}/test-receipt.jpg"

echo "=== M5 Receipt OCR E2E Test ==="
echo "Base URL: ${BASE_URL}"

# 1. Register + Login
echo "--- Step 1: Register and login ---"
# Use random email to avoid duplicate key errors
RAND_SUFFIX=$((100 + RANDOM % 900))
EMAIL="m5test_${RAND_SUFFIX}@example.com"
REGISTER=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"Test1234!\",\"nickname\":\"M5Tester\"}" || true)

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"Test1234!\"}")

TOKEN=$(echo "$LOGIN" | jq -r '.data.accessToken // empty')
if [ -z "$TOKEN" ]; then
  echo "FAIL: Could not login"
  echo "Login Response: ${LOGIN}"
  exit 1
fi
echo "OK: Got access token"

# 2. Create ledger
echo "--- Step 2: Create ledger ---"
LEDGER=$(curl -s -X POST "${BASE_URL}/ledgers" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"M5测试账本","type":"personal"}')

LEDGER_ID=$(echo "$LEDGER" | jq -r '.data.id // empty')
if [ -z "$LEDGER_ID" ]; then
  echo "FAIL: Could not create ledger"
  echo "Ledger Response: ${LEDGER}"
  exit 1
fi
echo "Ledger ID: ${LEDGER_ID}"

# 3. Create account + category
echo "--- Step 3: Create account and category ---"
curl -s -X POST "${BASE_URL}/ledgers/${LEDGER_ID}/accounts" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"微信","type":"wechat"}' > /dev/null

curl -s -X POST "${BASE_URL}/ledgers/${LEDGER_ID}/categories" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"餐饮","type":"expense"}' > /dev/null

echo "OK: Account and category created"

# 4. Upload receipt
echo "--- Step 4: Upload receipt image ---"
if [ ! -f "$TEST_IMAGE" ]; then
  echo "FAIL: Test image not found at ${TEST_IMAGE}"
  exit 1
fi

OCR_RESULT=$(curl -s -X POST "${BASE_URL}/ledgers/${LEDGER_ID}/ai/receipt-ocr" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${TEST_IMAGE}")

TASK_ID=$(echo "$OCR_RESULT" | jq -r '.data.taskId // empty')
if [ -z "$TASK_ID" ]; then
  echo "FAIL: Could not start OCR task"
  echo "OCR Result: ${OCR_RESULT}"
  exit 1
fi
echo "Task ID: ${TASK_ID}"
echo "Status: $(echo "$OCR_RESULT" | jq -r '.data.status // empty')"

# 5. Poll for result
echo "--- Step 5: Poll for OCR result ---"
for i in $(seq 1 30); do
  sleep 2
  TASK=$(curl -s "${BASE_URL}/ai/tasks/${TASK_ID}" \
    -H "Authorization: Bearer ${TOKEN}")
  STATUS=$(echo "$TASK" | jq -r '.data.status // empty')
  echo "  Poll ${i}: status=${STATUS}"
  if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
done

echo "Final task status info:"
echo "$TASK" | jq '.'

FINAL_STATUS=$(echo "$TASK" | jq -r '.data.status // empty')
if [ "$FINAL_STATUS" = "succeeded" ]; then
  echo "=== M5 E2E SUCCESS ==="
  exit 0
else
  echo "=== M5 E2E FAILED (Task status: ${FINAL_STATUS}) ==="
  exit 1
fi
