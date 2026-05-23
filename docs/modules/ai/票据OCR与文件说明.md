# M5 票据 OCR 与文件模块说明

本文档介绍记账平台中第一阶段 M5 票据 OCR 识别与文件存储的实现方案、开发规范及本地调试说明。

## 1. 功能目标

用户在移动端或 Web 端上传票据图片，系统异步调用 FastAPI OCR 服务识别金额、时间、商户等流水候选信息，生成 AI 候选流水。用户确认该流水候选时，系统在关联的账本下创建真实的消费记录，并自动将原票据图片作为附件关联至该交易。

## 2. 服务边界与架构

采用 **异步任务队列** 架构：
- **NestJS (`apps/api`)**：
  - 处理用户文件上传（Multipart 格式，仅支持 `image/jpeg`, `image/png`, `image/webp`，限制 10MB）。
  - 将原始图片上传至 **MinIO**（私有 Buckets，生存时间受控，按账本物理隔离）。
  - 生成 `ai_tasks` 任务记录（类型为 `receipt_ocr`，初始状态 `pending`）。
  - 向 **BullMQ (Redis)** 的 `ocr-tasks` 队列投递解析任务，并立即向前端返回 `202 Accepted`。
  - 提供轮询接口供前端查询任务状态，并支持流水确认/拒绝。
- **MinIO**：
  - 作为对象存储服务，存放用户上传的票据原始文件。
- **FastAPI (`apps/ai-service`)**：
  - 内部无状态 AI 计算节点。
  - 通过 Tesseract 引擎及规则逻辑，对传入的图片（经由 pre-signed URL）进行文字提取和关键要素（金额、商户、日期、明细等）匹配。
  - 返回统一的 `ReceiptOcrResponse` 格式。

### 核心处理流程

```
[前端] --- (POST /receipt-ocr) ---> [NestJS Controller]
                                           |
                                      (上传 MinIO)
                                           |
                                  (创建 pending 任务)
                                           |
                                  (发布 BullMQ 任务)
                                           |
[前端] <-- (202 Accepted 任务ID) ----------+

======================= 异步处理 =======================

[BullMQ Worker] <--- (消费任务) --- [BullMQ Queue]
       |
  (生成 MinIO 预签名URL)
       |
       v
[FastAPI OCR /internal/ai/receipt-ocr]
       |
   (下载图片)
       |
  (Tesseract)
       |
  (规则解析要素)
       |
[BullMQ Worker] <--- (返回识别候选)
       |
 (创建 ai_extractions 候选)
       |
 (更新任务状态为 succeeded)
```

## 3. 数据模型

### 3.1 TransactionAttachment (Prisma Model)
存储交易关联文件的元数据信息，不直接向外网公开 MinIO 的真实物理路径，仅暴露其 Storage Key 或生成 Pre-signed 临时下载 URL。
```prisma
model TransactionAttachment {
  id            String   @id @default(uuid())
  transactionId String   @map("transaction_id")
  fileUrl       String   @map("file_url")   // 对应存储中的 key/路径
  fileType      String   @map("file_type")   // 文件 MIME 类型（如 image/jpeg）
  storageKey    String   @map("storage_key")  // MinIO 对象存储实际的 key
  createdAt     DateTime @default(now()) @map("created_at")

  transaction Transaction @relation(fields: [transactionId], references: [id])

  @@index([transactionId])
  @@map("transaction_attachments")
}
```

### 3.2 AiTask (Prisma Model 复用)
`receipt_ocr` 任务复用 `AiTask` 结构：
- `type` 值为 `receipt_ocr`。
- `inputFileUrl` 字段用于存储图片文件在 MinIO 中的 `storageKey`。
- 任务执行成功后，会在 `AiExtraction` 生成候选数据，状态标记为 `succeeded`。

## 4. 存储规范 (MinIO)

- **Bucket 名称**：`bookkeeping-receipts`
- **Key 命名结构**：`receipts/{ledgerId}/{YYYY}/{MM}/{uuid}.{ext}`
  - 按账本维度（`ledgerId`）对文件对象进行物理隔离。
  - 包含年/月以便于后期文件归档和清理。
- **访问控制**：私有 (Private)。
  - 对外访问文件必须通过 `StorageService.getSignedUrl` 临时生成带有 Signature 的 Presigned URL，有效期默认设为 1 小时 (3600秒)。

## 5. 核心接口说明

### 5.1 上传票据 OCR 任务
- **路径**：`POST /api/ledgers/:ledgerId/ai/receipt-ocr`
- **内容类型**：`multipart/form-data`
- **参数**：
  - 文件字段 `file` (Blob / File)
- **响应**：`202 Accepted`
```json
{
  "success": true,
  "data": {
    "taskId": "c1a6b097-dfd4-46c9-ae07-2a6ffcc4870f",
    "ledgerId": "ledger-001",
    "status": "pending",
    "type": "receipt_ocr"
  }
}
```

### 5.2 确认流水候选 (含附件生成)
- **路径**：`POST /api/ai/extractions/:extractionId/confirm`
- **响应**：创建 Transaction 并将原始上传图片存入 `transaction_attachments`。

## 6. 本地运行与联调

### 6.1 基础设施准备
在项目根目录启动 MinIO 容器：
```bash
docker compose up -d minio
```
验证 MinIO 管理端访问：http://localhost:9001 (minioadmin / minioadmin)。

安装系统级 Tesseract（MacOS 示例）：
```bash
brew install tesseract tesseract-lang
```

### 6.2 启动应用
1. 启动 NestJS API 客户端：
```bash
cd apps/api && pnpm dev
```
2. 启动 FastAPI 助手服务：
```bash
cd apps/ai-service && uv run fastapi dev app/main.py
```
3. 确保 Redis 服务已运行在本地 `6379` 端口（NestJS BullMQ 强依赖）。

### 6.3 常见故障排查
1. **MinIO 报 BucketNotFound 错误**
   - 启动时 NestJS 会自动检查并调用 `StorageService.ensureBucket('bookkeeping-receipts')` 来初始化 Bucket。如未成功，可在 MinIO 控制台中手动创建 `bookkeeping-receipts`。
2. **FastAPI Tesseract 无法载入 chi_sim 语言包**
   - 检查本地是否安装了 `tesseract-lang`。可以在命令行终端中执行 `tesseract --list-langs` 确认输出中包含 `chi_sim`。
