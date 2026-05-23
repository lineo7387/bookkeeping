# M5 票据 OCR 与文件 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户上传票据图片，通过 BullMQ 异步队列调用 FastAPI Tesseract OCR，生成候选流水供确认。

**Architecture:** NestJS 接收 multipart 上传 → MinIO 存储 → BullMQ 投递 → Worker 调用 FastAPI OCR → 保存候选 → 前端轮询 → 用户确认创建交易 + 附件。

**Tech Stack:** NestJS 11, BullMQ, @aws-sdk/client-s3, MinIO, FastAPI, pytesseract, Pillow, Prisma 7

**Spec:** `docs/superpowers/specs/2026-05-23-m5-receipt-ocr-design.md`

---

## Task 1: Prisma Schema — TransactionAttachment 模型

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add TransactionAttachment model and Transaction relation**

在 `apps/api/prisma/schema.prisma` 的 `Transaction` 模型下方（第 274 行后）、`AiTask` 模型前方，添加：

```prisma
model TransactionAttachment {
  id            String      @id @default(uuid())
  transactionId String      @map("transaction_id")
  fileUrl       String      @map("file_url")
  fileType      String      @map("file_type")
  storageKey    String      @map("storage_key")
  createdAt     DateTime    @default(now()) @map("created_at")

  transaction Transaction @relation(fields: [transactionId], references: [id])

  @@index([transactionId])
  @@map("transaction_attachments")
}
```

在 `Transaction` 模型中（第 266 行 `creator` 之后），添加：

```prisma
  attachments TransactionAttachment[]
```

- [ ] **Step 2: Generate Prisma client and create migration**

Run:
```bash
cd apps/api && pnpm prisma:generate
cd apps/api && pnpm prisma:migrate --name add_transaction_attachments
```

Expected: Migration SQL 包含 `CREATE TABLE "transaction_attachments"` 和 `CREATE INDEX`，Prisma 客户端重新生成成功。

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add TransactionAttachment prisma model"
```

---

## Task 2: Infrastructure — Docker MinIO + 环境变量

**Files:**
- Create: `docker-compose.yml`（项目根目录）
- Modify: `apps/api/.env.example`
- Modify: `apps/api/.env`（本地）

- [ ] **Step 1: Create docker-compose.yml**

在项目根目录 `/Users/lineo/code/pro/Bookkeeping/docker-compose.yml` 创建：

```yaml
version: "3.8"

services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  minio-data:
```

- [ ] **Step 2: Update .env.example with storage and Redis variables**

在 `apps/api/.env.example` 末尾追加：

```env
JWT_SECRET=change-me-in-production
AI_SERVICE_TIMEOUT_MS=5000
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_REGION=us-east-1
STORAGE_RECEIPT_BUCKET=bookkeeping-receipts
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

- [ ] **Step 3: Update .env (local) with same variables**

在 `apps/api/.env` 末尾追加相同的 storage 和 Redis 变量。

- [ ] **Step 4: User installs and starts MinIO**

提示用户执行：

```bash
cd /Users/lineo/code/pro/Bookkeeping
docker compose up -d minio
```

验证 MinIO Console 可访问 http://localhost:9001（user: minioadmin, pass: minioadmin）。

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml apps/api/.env.example
git commit -m "chore: add docker-compose with MinIO and env config"
```

---

## Task 3: NestJS Storage Module

**Files:**
- Create: `apps/api/src/storage/storage.constants.ts`
- Create: `apps/api/src/storage/storage.service.ts`
- Create: `apps/api/src/storage/storage.module.ts`
- Create: `apps/api/src/storage/storage.service.spec.ts`

- [ ] **Step 1: Write storage constants**

Create `apps/api/src/storage/storage.constants.ts`:

```typescript
export const STORAGE_S3_CLIENT = Symbol('STORAGE_S3_CLIENT');

export const DEFAULT_SIGNED_URL_EXPIRES_SECONDS = 3600;
```

- [ ] **Step 2: Write the failing test for StorageService**

Create `apps/api/src/storage/storage.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { STORAGE_S3_CLIENT } from './storage.constants';

describe('StorageService', () => {
  let service: StorageService;
  let mockS3Send: jest.Mock;

  beforeEach(async () => {
    mockS3Send = jest.fn().mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: STORAGE_S3_CLIENT, useValue: { send: mockS3Send } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STORAGE_RECEIPT_BUCKET') return 'test-bucket';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(StorageService);
  });

  it('should upload a file and return storage key', async () => {
    const key = await service.upload('test-bucket', 'receipts/test.jpg', Buffer.from('img'), 'image/jpeg');
    expect(key).toBe('receipts/test.jpg');
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });

  it('should delete a file', async () => {
    await service.delete('test-bucket', 'receipts/test.jpg');
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- --testPathPattern storage.service.spec`
Expected: FAIL — StorageService not found

- [ ] **Step 4: Implement StorageService**

Create `apps/api/src/storage/storage.service.ts`:

```typescript
import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fail } from '../common/api-response';
import { DEFAULT_SIGNED_URL_EXPIRES_SECONDS, STORAGE_S3_CLIENT } from './storage.constants';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {}

  async upload(bucket: string, key: string, buffer: Buffer, mimeType: string): Promise<string> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      return key;
    } catch (error) {
      this.logger.error(`Failed to upload ${key} to ${bucket}`, error);
      throw new InternalServerErrorException(fail('STORAGE_UPLOAD_FAILED' as any, 'File upload failed'));
    }
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRES_SECONDS,
  ): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async delete(bucket: string, key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
      this.logger.error(`Failed to delete ${key} from ${bucket}`, error);
    }
  }

  async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      this.logger.log(`Creating bucket: ${bucket}`);
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }
}
```

- [ ] **Step 5: Create StorageModule**

Create `apps/api/src/storage/storage.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { STORAGE_S3_CLIENT } from './storage.constants';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new S3Client({
          endpoint: config.get('STORAGE_ENDPOINT', 'http://127.0.0.1:9000'),
          region: config.get('STORAGE_REGION', 'us-east-1'),
          credentials: {
            accessKeyId: config.get('STORAGE_ACCESS_KEY', 'minioadmin'),
            secretAccessKey: config.get('STORAGE_SECRET_KEY', 'minioadmin'),
          },
          forcePathStyle: true,
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- --testPathPattern storage.service.spec`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/storage/
git commit -m "feat: add StorageService with S3/MinIO support"
```

---

## Task 4: Install NestJS Dependencies (BullMQ + S3 SDK)

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: User installs dependencies**

提示用户执行：

```bash
cd apps/api
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @nestjs/bullmq bullmq
pnpm add -D @types/multer
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/api && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add S3 SDK and BullMQ dependencies"
```

---

## Task 5: NestJS Queue Module (BullMQ Global Setup)

**Files:**
- Create: `apps/api/src/queue/queue.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create QueueModule**

Create `apps/api/src/queue/queue.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', '127.0.0.1'),
          port: Number(config.get('REDIS_PORT', '6379')),
        },
      }),
    }),
  ],
})
export class QueueModule {}
```

- [ ] **Step 2: Register QueueModule and StorageModule in AppModule**

In `apps/api/src/app.module.ts`, add imports:

```typescript
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
```

Add to the `imports` array (after `ConfigModule.forRoot(...)`):

```typescript
    QueueModule,
    StorageModule,
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/queue/ apps/api/src/app.module.ts
git commit -m "feat: add global QueueModule with BullMQ and register StorageModule"
```

---

## Task 6: Shared Types — OCR Types

**Files:**
- Modify: `packages/shared-types/src/index.ts`

- [ ] **Step 1: Add ReceiptOcrAcceptedResult and TransactionAttachment types**

在 `packages/shared-types/src/index.ts` 末尾（第 313 行后）追加：

```typescript
export interface ReceiptOcrAcceptedResult {
  taskId: string;
  ledgerId: string;
  status: 'pending';
  type: 'receipt_ocr';
}

export interface TransactionAttachmentSummary {
  id: string;
  transactionId: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd packages/shared-types && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/
git commit -m "feat: add ReceiptOcrAcceptedResult and TransactionAttachmentSummary types"
```

---

## Task 7: FastAPI — OCR Schemas

**Files:**
- Create: `apps/ai-service/app/schemas/receipt_ocr.py`

- [ ] **Step 1: Create Pydantic models for receipt OCR**

Create `apps/ai-service/app/schemas/receipt_ocr.py`:

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/ai-service/app/schemas/receipt_ocr.py
git commit -m "feat: add FastAPI receipt OCR Pydantic schemas"
```

---

## Task 8: FastAPI — OCR Provider Abstraction + Tesseract Implementation

**Files:**
- Create: `apps/ai-service/app/providers/ocr_provider.py`
- Create: `apps/ai-service/app/providers/tesseract_provider.py`

- [ ] **Step 1: User installs system dependencies**

提示用户执行：

```bash
brew install tesseract tesseract-lang
```

验证: `tesseract --version` 输出版本号。

- [ ] **Step 2: User installs Python dependencies**

提示用户执行：

```bash
cd apps/ai-service
uv add pytesseract Pillow
```

- [ ] **Step 3: Create OCR provider abstract interface**

Create `apps/ai-service/app/providers/ocr_provider.py`:

```python
from abc import ABC, abstractmethod


class OcrProvider(ABC):
    """Abstract interface for OCR text extraction from images."""

    @abstractmethod
    async def extract_text(self, image_bytes: bytes, mime_type: str) -> list[str]:
        """Extract text blocks from an image.

        Args:
            image_bytes: Raw image file bytes.
            mime_type: MIME type of the image (image/jpeg, image/png, image/webp).

        Returns:
            List of non-empty text lines extracted from the image.
        """
        ...
```

- [ ] **Step 4: Implement TesseractProvider**

Create `apps/ai-service/app/providers/tesseract_provider.py`:

```python
import io
import logging

import pytesseract
from PIL import Image

from app.providers.ocr_provider import OcrProvider

logger = logging.getLogger(__name__)


class TesseractProvider(OcrProvider):
    """OCR provider using local Tesseract engine."""

    def __init__(self, lang: str = "chi_sim+eng") -> None:
        self.lang = lang

    async def extract_text(self, image_bytes: bytes, mime_type: str) -> list[str]:
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception:
            logger.warning("Failed to open image, mime_type=%s", mime_type)
            return []

        try:
            raw_text: str = pytesseract.image_to_string(image, lang=self.lang)
        except Exception:
            logger.exception("Tesseract OCR failed")
            return []

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        return lines
```

- [ ] **Step 5: Commit**

```bash
git add apps/ai-service/app/providers/
git commit -m "feat: add OCR provider abstraction and Tesseract implementation"
```

---

## Task 9: FastAPI — OCR Service + Route

**Files:**
- Create: `apps/ai-service/app/services/receipt_ocr_service.py`
- Create: `apps/ai-service/app/api/routes/receipt_ocr.py`
- Modify: `apps/ai-service/app/main.py`
- Create: `apps/ai-service/tests/test_receipt_ocr.py`

- [ ] **Step 1: Write the failing test**

Create `apps/ai-service/tests/test_receipt_ocr.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/ai-service && uv run pytest tests/test_receipt_ocr.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement receipt_ocr_service**

Create `apps/ai-service/app/services/receipt_ocr_service.py`:

```python
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
        amount = "0.00"

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
```

- [ ] **Step 4: Create receipt OCR route**

Create `apps/ai-service/app/api/routes/receipt_ocr.py`:

```python
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
```

- [ ] **Step 5: Register route in main.py**

In `apps/ai-service/app/main.py`, add:

```python
from app.api.routes.receipt_ocr import router as receipt_ocr_router
```

And add after the existing `app.include_router(text_transactions_router)`:

```python
app.include_router(receipt_ocr_router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/ai-service && uv run pytest tests/test_receipt_ocr.py -v`
Expected: 2 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/ai-service/
git commit -m "feat: add FastAPI receipt OCR endpoint with Tesseract provider"
```

---

## Task 10: NestJS AI Internal Client — Receipt OCR Method

**Files:**
- Modify: `apps/api/src/ai/ai-internal-client.ts`
- Modify: `apps/api/src/ai/ai.types.ts`

- [ ] **Step 1: Add OCR types to ai.types.ts**

In `apps/api/src/ai/ai.types.ts`, append before the final `export type` line (before line 87):

```typescript
export interface InternalAiOcrCandidate {
  type: 'income' | 'expense';
  amount: string;
  currency: string;
  occurredAt: string;
  categoryName: string | null;
  accountHint: string | null;
  merchant: string | null;
  note: string | null;
  confidence: number;
  missingFields?: AiCandidateMissingField[];
  reviewMessage?: string | null;
  receipt?: {
    invoiceNo: string | null;
    taxNo: string | null;
    items: Array<{
      name: string;
      quantity: string | null;
      unitPrice: string | null;
      amount: string;
    }>;
  } | null;
}

export interface InternalAiOcrResult {
  status: 'succeeded' | 'failed';
  candidate: InternalAiOcrCandidate | null;
  rawResult: Record<string, unknown> | null;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  } | null;
}

export interface ParseReceiptOcrRequest {
  taskId: string;
  ledgerId: string;
  userId: string;
  signedUrl: string;
  storageKey: string;
  mimeType: string;
  locale: string;
  timezone: string;
  defaultCurrency: string;
  context: TextParseContext;
}
```

- [ ] **Step 2: Add parseReceiptOcr method to AiInternalClient**

In `apps/api/src/ai/ai-internal-client.ts`, add import of new type at line 4:

```typescript
import type { InternalAiOcrResult, InternalAiTextResult, ParseReceiptOcrRequest, TextParseContext } from './ai.types';
```

Add the new method inside the `AiInternalClient` class (after `parseTextTransaction`, before the closing `}`):

```typescript
  async parseReceiptOcr(request: ParseReceiptOcrRequest): Promise<InternalAiOcrResult> {
    const baseUrl = this.configService.get<string>('AI_SERVICE_BASE_URL') ?? 'http://127.0.0.1:8000';
    const timeoutMs = getTimeoutMs(this.configService.get<string>('AI_OCR_TIMEOUT_MS')) || 30000;
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${baseUrl.replace(/\/+$/, '')}/internal/ai/receipt-ocr`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          taskId: request.taskId,
          ledgerId: request.ledgerId,
          userId: request.userId,
          file: {
            storageKey: request.storageKey,
            signedUrl: request.signedUrl,
            mimeType: request.mimeType,
          },
          locale: request.locale,
          timezone: request.timezone,
          defaultCurrency: request.defaultCurrency,
          context: {
            categoryNames: request.context.categoryNames,
            accountHints: request.context.accountHints,
          },
        }),
      });
    } catch {
      throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI OCR service request failed'));
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI OCR service request failed'));
    }

    const body = (await response.json()) as unknown;
    if (!isInternalAiOcrResult(body)) {
      throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI OCR service response is invalid'));
    }

    return body;
  }
```

Add the validation function at the bottom of the file (before the final `getTimeoutMs`):

```typescript
function isInternalAiOcrResult(value: unknown): value is InternalAiOcrResult {
  if (!value || typeof value !== 'object') return false;
  if (!('status' in value) || (value.status !== 'succeeded' && value.status !== 'failed')) return false;
  if (!('candidate' in value)) return false;
  if (value.status === 'failed') return true;
  const candidate = (value as Record<string, unknown>).candidate;
  if (!candidate || typeof candidate !== 'object') return false;
  const c = candidate as Record<string, unknown>;
  return (
    (c.type === 'income' || c.type === 'expense') &&
    typeof c.amount === 'string' &&
    typeof c.currency === 'string' &&
    typeof c.confidence === 'number'
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/api && pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai/ai-internal-client.ts apps/api/src/ai/ai.types.ts
git commit -m "feat: add parseReceiptOcr method to AiInternalClient"
```

---

## Task 11: NestJS AI — OCR Queue Constants, Repository Extension, File Filter

**Files:**
- Create: `apps/api/src/ai/ocr-queue.constants.ts`
- Create: `apps/api/src/ai/dto/receipt-ocr-file.filter.ts`
- Modify: `apps/api/src/ai/ai.repository.ts`

- [ ] **Step 1: Create OCR queue constants**

Create `apps/api/src/ai/ocr-queue.constants.ts`:

```typescript
export const OCR_QUEUE_NAME = 'ocr-tasks';
export const OCR_JOB_NAME = 'process-receipt';

export interface OcrJobData {
  taskId: string;
  ledgerId: string;
  userId: string;
  storageKey: string;
  mimeType: string;
}
```

- [ ] **Step 2: Create image file filter**

Create `apps/api/src/ai/dto/receipt-ocr-file.filter.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { fail } from '../../common/api-response';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(fail('VALIDATION_FAILED', '仅支持 JPEG、PNG、WebP 格式')), false);
  }
}

export function mimeToExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}
```

- [ ] **Step 3: Add createReceiptOcrTask and createTransactionAttachment to AiRepository**

In `apps/api/src/ai/ai.repository.ts`, add the following methods inside the `AiRepository` class (before `runInTransaction`):

```typescript
  async createReceiptOcrTask(data: {
    ledgerId: string;
    userId: string;
    inputFileUrl: string;
  }): Promise<AiTaskDetail> {
    const task = await this.prisma.aiTask.create({
      data: {
        ledgerId: data.ledgerId,
        userId: data.userId,
        type: 'receipt_ocr',
        status: 'pending',
        inputFileUrl: data.inputFileUrl,
      },
      include: { extractions: true },
    });
    return toAiTaskDetail(task as AiTaskRecord);
  }

  async markTaskProcessing(taskId: string): Promise<void> {
    await this.prisma.aiTask.update({
      where: { id: taskId },
      data: { status: 'processing' },
    });
  }

  async findTaskById(taskId: string): Promise<AiTaskDetail | null> {
    const task = await this.prisma.aiTask.findUnique({
      where: { id: taskId },
      include: { extractions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return task ? toAiTaskDetail(task as AiTaskRecord) : null;
  }

  async createTransactionAttachment(
    tx: { transactionAttachment: { create(args: any): Promise<any> } },
    data: { transactionId: string; fileUrl: string; fileType: string; storageKey: string },
  ): Promise<void> {
    await tx.transactionAttachment.create({ data });
  }
```

- [ ] **Step 4: Verify typecheck**

Run: `cd apps/api && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/ocr-queue.constants.ts apps/api/src/ai/dto/receipt-ocr-file.filter.ts apps/api/src/ai/ai.repository.ts
git commit -m "feat: add OCR queue constants, file filter, and repository methods"
```

---

## Task 12: NestJS AI Service — submitReceiptOcr + Confirm Extension

**Files:**
- Modify: `apps/api/src/ai/ai.service.ts`

- [ ] **Step 1: Add submitReceiptOcr method**

In `apps/api/src/ai/ai.service.ts`, add imports at the top:

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service';
import { OCR_QUEUE_NAME, OCR_JOB_NAME, type OcrJobData } from './ocr-queue.constants';
import { mimeToExtension } from './dto/receipt-ocr-file.filter';
import type { ReceiptOcrAcceptedResult } from '@bookkeeping/shared-types';
```

Update constructor to inject new dependencies:

```typescript
  constructor(
    private readonly aiRepository: AiRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
    private readonly aiInternalClient: AiInternalClient,
    private readonly transactionsService: TransactionsService,
    private readonly storageService: StorageService,
    @InjectQueue(OCR_QUEUE_NAME) private readonly ocrQueue: Queue<OcrJobData>,
  ) {}
```

Add the method (before `listLedgerTasks`):

```typescript
  async submitReceiptOcr(
    userId: string,
    ledgerId: string,
    file: Express.Multer.File,
  ): Promise<ReceiptOcrAcceptedResult> {
    await this.requireCreateTransaction(userId, ledgerId);

    const now = new Date();
    const ext = mimeToExtension(file.mimetype);
    const storageKey = `receipts/${ledgerId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`;
    const bucket = 'bookkeeping-receipts';

    await this.storageService.upload(bucket, storageKey, file.buffer, file.mimetype);

    const task = await this.aiRepository.createReceiptOcrTask({
      ledgerId,
      userId,
      inputFileUrl: storageKey,
    });

    await this.ocrQueue.add(OCR_JOB_NAME, {
      taskId: task.id,
      ledgerId,
      userId,
      storageKey,
      mimeType: file.mimetype,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    return {
      taskId: task.id,
      ledgerId,
      status: 'pending',
      type: 'receipt_ocr',
    };
  }
```

- [ ] **Step 2: Extend confirmExtraction to create attachment for OCR tasks**

In the `confirmExtraction` method, after the transaction and confirmed extraction are obtained inside `runInTransaction`, add attachment creation logic. Replace the return block inside `runInTransaction`:

```typescript
    return this.aiRepository.runInTransaction(async (tx) => {
      const transaction = await this.transactionsService.createFromAiExtraction(
        userId,
        transactionInput,
        tx as unknown as TransactionClient,
      );
      const confirmed = await this.aiRepository.confirmExtractionInTransaction({
        tx,
        extractionId,
        userId,
      });
      if (!confirmed) {
        throw aiResourceNotFound();
      }

      // M5: Create attachment for OCR tasks
      const task = await this.aiRepository.findTaskById(confirmed.taskId);
      if (task && task.type === 'receipt_ocr' && task.extraction) {
        const aiTask = await this.aiRepository.findRawTask(confirmed.taskId);
        if (aiTask?.inputFileUrl) {
          await this.aiRepository.createTransactionAttachment(tx as any, {
            transactionId: transaction.id,
            fileUrl: aiTask.inputFileUrl,
            fileType: mimeToExtension(aiTask.inputFileUrl.split('.').pop() ?? '') === 'bin'
              ? 'image/jpeg'
              : `image/${aiTask.inputFileUrl.split('.').pop()}`,
            storageKey: aiTask.inputFileUrl,
          });
        }
      }

      return {
        ledgerId: confirmed.ledgerId,
        transactionId: transaction.id,
        extraction: confirmed,
        transaction,
      };
    });
```

- [ ] **Step 3: Add findRawTask to AiRepository**

In `apps/api/src/ai/ai.repository.ts`, add:

```typescript
  async findRawTask(taskId: string): Promise<{ inputFileUrl: string | null; type: string } | null> {
    return this.prisma.aiTask.findUnique({
      where: { id: taskId },
      select: { inputFileUrl: true, type: true },
    });
  }
```

- [ ] **Step 4: Verify typecheck**

Run: `cd apps/api && pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/ai.service.ts apps/api/src/ai/ai.repository.ts
git commit -m "feat: add submitReceiptOcr and extend confirmExtraction for attachments"
```

---

## Task 13: NestJS AI Controller — Receipt OCR Endpoint

**Files:**
- Modify: `apps/api/src/ai/ai.controller.ts`

- [ ] **Step 1: Add receipt-ocr endpoint**

In `apps/api/src/ai/ai.controller.ts`, add imports:

```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from './dto/receipt-ocr-file.filter';
```

Add the method inside `AiController` (after `parseText`, before `listTasks`):

```typescript
  @Post('ledgers/:ledgerId/ai/receipt-ocr')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async receiptOcr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      const { fail: failFn } = await import('../common/api-response');
      throw new (await import('@nestjs/common')).BadRequestException(failFn('VALIDATION_FAILED', '请上传票据图片'));
    }
    return ok(await this.aiService.submitReceiptOcr(user.id, ledgerId, file));
  }
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/api && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ai/ai.controller.ts
git commit -m "feat: add receipt-ocr controller endpoint"
```

---

## Task 14: NestJS AI — OCR Queue Processor (Worker)

**Files:**
- Create: `apps/api/src/ai/ocr-queue.processor.ts`
- Create: `apps/api/src/ai/ocr-queue.processor.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/ai/ocr-queue.processor.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { OcrQueueProcessor } from './ocr-queue.processor';
import { AiRepository } from './ai.repository';
import { AiInternalClient } from './ai-internal-client';
import { StorageService } from '../storage/storage.service';
import type { Job } from 'bullmq';
import type { OcrJobData } from './ocr-queue.constants';

describe('OcrQueueProcessor', () => {
  let processor: OcrQueueProcessor;
  let mockRepo: Partial<AiRepository>;
  let mockClient: Partial<AiInternalClient>;
  let mockStorage: Partial<StorageService>;

  beforeEach(async () => {
    mockRepo = {
      markTaskProcessing: jest.fn().mockResolvedValue(undefined),
      markTaskSucceeded: jest.fn().mockResolvedValue({ id: 'task-1' }),
      markTaskFailed: jest.fn().mockResolvedValue({ id: 'task-1' }),
      createExtraction: jest.fn().mockResolvedValue({ id: 'ext-1' }),
      getTextParseContext: jest.fn().mockResolvedValue({
        timezone: 'Asia/Shanghai',
        defaultCurrency: 'CNY',
        categoryNames: ['餐饮'],
        accountHints: ['微信'],
      }),
    };
    mockClient = {
      parseReceiptOcr: jest.fn().mockResolvedValue({
        status: 'succeeded',
        candidate: {
          type: 'expense',
          amount: '68.00',
          currency: 'CNY',
          occurredAt: '2026-05-23T12:00:00+08:00',
          categoryName: '餐饮',
          accountHint: null,
          merchant: '示例餐厅',
          note: '票据识别候选',
          confidence: 0.85,
        },
        rawResult: { provider: 'tesseract' },
      }),
    };
    mockStorage = {
      getSignedUrl: jest.fn().mockResolvedValue('http://minio/signed-url'),
    };

    const module = await Test.createTestingModule({
      providers: [
        OcrQueueProcessor,
        { provide: AiRepository, useValue: mockRepo },
        { provide: AiInternalClient, useValue: mockClient },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();

    processor = module.get(OcrQueueProcessor);
  });

  it('should process OCR job successfully', async () => {
    const job = {
      data: {
        taskId: 'task-1',
        ledgerId: 'ledger-1',
        userId: 'user-1',
        storageKey: 'receipts/test.jpg',
        mimeType: 'image/jpeg',
      },
    } as Job<OcrJobData>;

    await processor.process(job);

    expect(mockRepo.markTaskProcessing).toHaveBeenCalledWith('task-1');
    expect(mockStorage.getSignedUrl).toHaveBeenCalled();
    expect(mockClient.parseReceiptOcr).toHaveBeenCalled();
    expect(mockRepo.createExtraction).toHaveBeenCalled();
    expect(mockRepo.markTaskSucceeded).toHaveBeenCalledWith('task-1');
  });

  it('should mark task failed on error', async () => {
    (mockClient.parseReceiptOcr as jest.Mock).mockRejectedValue(new Error('timeout'));

    const job = {
      data: {
        taskId: 'task-1',
        ledgerId: 'ledger-1',
        userId: 'user-1',
        storageKey: 'receipts/test.jpg',
        mimeType: 'image/jpeg',
      },
    } as Job<OcrJobData>;

    await expect(processor.process(job)).rejects.toThrow();
    expect(mockRepo.markTaskFailed).toHaveBeenCalledWith('task-1', expect.any(String));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- --testPathPattern ocr-queue.processor.spec`
Expected: FAIL — OcrQueueProcessor not found

- [ ] **Step 3: Implement OcrQueueProcessor**

Create `apps/api/src/ai/ocr-queue.processor.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { StorageService } from '../storage/storage.service';
import { AiInternalClient } from './ai-internal-client';
import { AiRepository } from './ai.repository';
import { OCR_QUEUE_NAME, type OcrJobData } from './ocr-queue.constants';
import type { AiCandidateTransaction } from './ai.types';

@Injectable()
@Processor(OCR_QUEUE_NAME, { concurrency: 2 })
export class OcrQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrQueueProcessor.name);

  constructor(
    private readonly aiRepository: AiRepository,
    private readonly aiInternalClient: AiInternalClient,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<OcrJobData>): Promise<void> {
    const { taskId, ledgerId, userId, storageKey, mimeType } = job.data;
    this.logger.log(`Processing OCR job for task ${taskId}`);

    await this.aiRepository.markTaskProcessing(taskId);

    try {
      const signedUrl = await this.storageService.getSignedUrl('bookkeeping-receipts', storageKey);
      const context = await this.aiRepository.getTextParseContext(ledgerId, userId);

      if (!context) {
        await this.aiRepository.markTaskFailed(taskId, 'Ledger context not found');
        throw new Error('Ledger context not found');
      }

      const result = await this.aiInternalClient.parseReceiptOcr({
        taskId,
        ledgerId,
        userId,
        signedUrl,
        storageKey,
        mimeType,
        locale: 'zh-CN',
        timezone: context.timezone,
        defaultCurrency: context.defaultCurrency,
        context,
      });

      if (result.status === 'failed' || !result.candidate) {
        const errorMsg = result.error?.message ?? 'OCR processing failed';
        await this.aiRepository.markTaskFailed(taskId, errorMsg);
        throw new Error(errorMsg);
      }

      const candidate: AiCandidateTransaction = {
        ledgerId,
        type: result.candidate.type,
        amount: result.candidate.amount,
        currency: result.candidate.currency,
        occurredAt: result.candidate.occurredAt,
        visibility: 'ledger',
        categoryName: result.candidate.categoryName,
        accountHint: result.candidate.accountHint,
        merchant: result.candidate.merchant,
        note: result.candidate.note,
        confidence: result.candidate.confidence,
        missingFields: result.candidate.missingFields,
        reviewMessage: result.candidate.reviewMessage,
        receipt: result.candidate.receipt ?? undefined,
      };

      await this.aiRepository.createExtraction({
        aiTaskId: taskId,
        ledgerId,
        userId,
        rawResult: (result.rawResult as Record<string, unknown>) ?? { provider: 'unknown' },
        suggestedTransaction: candidate,
        confidence: result.candidate.confidence,
      });

      await this.aiRepository.markTaskSucceeded(taskId);
      this.logger.log(`OCR job completed for task ${taskId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OCR error';
      this.logger.error(`OCR job failed for task ${taskId}: ${message}`);
      await this.aiRepository.markTaskFailed(taskId, message).catch(() => {});
      throw error;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api && pnpm test -- --testPathPattern ocr-queue.processor.spec`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/ocr-queue.processor.ts apps/api/src/ai/ocr-queue.processor.spec.ts
git commit -m "feat: add OCR queue processor with tests"
```

---

## Task 15: NestJS AI Module — Wire Everything

**Files:**
- Modify: `apps/api/src/ai/ai.module.ts`

- [ ] **Step 1: Update AI module to register queue and processor**

Replace `apps/api/src/ai/ai.module.ts` content with:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PoliciesModule } from '../policies/policies.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AiController } from './ai.controller';
import { AI_FETCH_IMPL, AiInternalClient } from './ai-internal-client';
import { AiRepository } from './ai.repository';
import { AiService } from './ai.service';
import { OCR_QUEUE_NAME } from './ocr-queue.constants';
import { OcrQueueProcessor } from './ocr-queue.processor';

@Module({
  imports: [
    PoliciesModule,
    TransactionsModule,
    BullModule.registerQueue({ name: OCR_QUEUE_NAME }),
  ],
  controllers: [AiController],
  providers: [
    { provide: AI_FETCH_IMPL, useValue: fetch },
    AiInternalClient,
    AiRepository,
    AiService,
    OcrQueueProcessor,
  ],
})
export class AiModule {}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/api && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ai/ai.module.ts
git commit -m "feat: wire OCR queue and processor into AI module"
```

---

## Task 16: API Client — receiptOcr Method

**Files:**
- Modify: `packages/api-client/src/index.ts`

- [ ] **Step 1: Add ReceiptOcrAcceptedResult import and receiptOcr method**

In `packages/api-client/src/index.ts`, add to the import list (line 1):

```typescript
import type {
  // ... existing imports ...
  ReceiptOcrAcceptedResult,
} from '@bookkeeping/shared-types';
```

Add the method inside `BookkeepingApiClient` class (after `parseAiText`):

```typescript
  async receiptOcr(
    ledgerId: string,
    file: Blob | File,
  ): Promise<ApiResponse<ReceiptOcrAcceptedResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestMultipart<ReceiptOcrAcceptedResult>(
      `/ledgers/${encodeURIComponent(ledgerId)}/ai/receipt-ocr`,
      formData,
    );
  }
```

Add the `requestMultipart` private method (after the existing `request` method):

```typescript
  private async requestMultipart<T>(
    path: string,
    formData: FormData,
  ): Promise<ApiResponse<T>> {
    const headers = new Headers(this.defaultHeaders);
    headers.set('Accept', 'application/json');
    // Do NOT set Content-Type — let the runtime set multipart boundary automatically

    const accessToken = await this.getAccessToken?.();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Network request failed',
          details: toErrorDetails(error),
        },
      };
    }

    const parsed = await parseJsonResponse<T>(response);
    if (parsed.kind === 'response') return parsed.response;
    if (parsed.kind === 'invalid') {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: parsed.message, details: parsed.details } };
    }
    return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Empty API response body', details: { status: response.status } } };
  }
```

Add to the re-export list at the bottom:

```typescript
export type {
  // ... existing exports ...
  ReceiptOcrAcceptedResult,
};
```

- [ ] **Step 2: Verify typecheck**

Run: `cd packages/api-client && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/api-client/
git commit -m "feat: add receiptOcr method with multipart upload to api-client"
```

---

## Task 17: Chinese Module Documentation

**Files:**
- Create: `docs/modules/ai/票据OCR与文件说明.md`

- [ ] **Step 1: Create M5 Chinese module documentation**

Create `docs/modules/ai/票据OCR与文件说明.md`，内容结构参考 M4 AI文本记账说明.md，包含：

1. 功能目标 — M5 票据 OCR 与文件概述
2. 范围 — M5 包含 / M5 不包含
3. 服务边界 — NestJS / FastAPI / MinIO
4. 数据模型 — TransactionAttachment，AiTask 复用
5. 标准流程 — ASCII 流程图
6. 接口说明 — POST receipt-ocr（202），轮询 GET tasks/:taskId，确认/拒绝
7. 权限规则
8. 异常情况 — 错误码表
9. 存储规范 — MinIO bucket、key 命名、signed URL
10. 本地运行和联调示例
11. 故障排查
12. 测试与验证方式
13. 后续扩展点

- [ ] **Step 2: Commit**

```bash
git add docs/modules/ai/票据OCR与文件说明.md
git commit -m "docs: add M5 receipt OCR Chinese module documentation"
```

---

## Task 18: E2E Verification Script + Context Sync

**Files:**
- Create: `scripts/e2e-m5-receipt-ocr.sh`
- Modify: `package.json`（根目录）
- Modify: `.agents/project-context.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Create test receipt image**

创建一个简单的测试票据图片到 `scripts/test-receipt.jpg`（可以用任何包含中文金额文字的图片，或用 ImageMagick 生成一个）。

- [ ] **Step 2: Create E2E script**

Create `scripts/e2e-m5-receipt-ocr.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000/api}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEST_IMAGE="${SCRIPT_DIR}/test-receipt.jpg"

echo "=== M5 Receipt OCR E2E Test ==="
echo "Base URL: ${BASE_URL}"

# 1. Register + Login
echo "--- Step 1: Register and login ---"
REGISTER=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"m5test@example.com","password":"Test1234!","nickname":"M5Tester"}' || true)

LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"m5test@example.com","password":"Test1234!"}')

TOKEN=$(echo "$LOGIN" | jq -r '.data.accessToken // empty')
if [ -z "$TOKEN" ]; then
  echo "FAIL: Could not login"
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
  echo "WARN: No test image at ${TEST_IMAGE}, creating placeholder"
  echo "placeholder" > "$TEST_IMAGE"
fi

OCR_RESULT=$(curl -s -X POST "${BASE_URL}/ledgers/${LEDGER_ID}/ai/receipt-ocr" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@${TEST_IMAGE}")

TASK_ID=$(echo "$OCR_RESULT" | jq -r '.data.taskId // empty')
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

echo "Final task:"
echo "$TASK" | jq '.'

echo "=== M5 E2E Complete ==="
```

- [ ] **Step 3: Add e2e script to root package.json**

Add to root `package.json` scripts:

```json
"e2e:m5:receipt-ocr": "bash scripts/e2e-m5-receipt-ocr.sh"
```

- [ ] **Step 4: Update project context and AGENTS.md**

Update `.agents/project-context.md` and `AGENTS.md` to reflect M5 completion status.

- [ ] **Step 5: Commit**

```bash
chmod +x scripts/e2e-m5-receipt-ocr.sh
git add scripts/ package.json .agents/ AGENTS.md
git commit -m "feat: add M5 receipt OCR e2e script and update project context"
```
