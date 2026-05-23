# M5：票据 OCR 与文件 — 设计规格

## 1. 功能目标

用户上传票据图片，系统通过 OCR 识别票据内容并生成候选流水，用户确认后创建正式交易并自动关联附件。

### 核心用户流程

```
上传票据图片 → NestJS 存图到 MinIO → 创建异步 OCR 任务
→ BullMQ Worker 调用 FastAPI Tesseract OCR → 保存候选结果
→ 前端轮询任务状态 → 用户确认/拒绝 → 创建正式交易 + 附件
```

### 技术选型（已确认）

| 决策项 | 选择 |
|--------|------|
| 对象存储 | MinIO（S3 兼容，Docker 本地运行） |
| 异步队列 | BullMQ + Redis |
| OCR 引擎 | Tesseract（本地开源，pytesseract + chi_sim） |
| 文件限制 | 10MB，JPEG/PNG/WebP，单张图片 |

---

## 2. 数据模型变更

### 2.1 新增 `TransactionAttachment` 模型

```prisma
model TransactionAttachment {
  id            String   @id @default(uuid())
  transactionId String   @map("transaction_id")
  fileUrl       String   @map("file_url")       // MinIO 对象路径
  fileType      String   @map("file_type")       // MIME type
  storageKey    String   @map("storage_key")     // MinIO bucket 内完整 key
  createdAt     DateTime @default(now()) @map("created_at")

  transaction Transaction @relation(fields: [transactionId], references: [id])

  @@index([transactionId])
  @@map("transaction_attachments")
}
```

### 2.2 `Transaction` 模型补充关系

```prisma
// 新增关系字段
attachments TransactionAttachment[]
```

### 2.3 已有模型（无需改动）

- `AiTask`：已有 `inputFileUrl`、`receipt_ocr` 类型、完整状态机
- `AiExtraction`：候选结构已支持 `receipt` 字段
- `Transaction`：已有 `source: ocr`

---

## 3. 存储层（MinIO + Storage Module）

### 3.1 MinIO 基础设施

Docker Compose 新增 MinIO 服务：

```yaml
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
```

Bucket：`bookkeeping-receipts`（NestJS 启动时自动创建）。

### 3.2 NestJS Storage Module

```
apps/api/src/storage/
  storage.module.ts
  storage.service.ts
  storage.constants.ts
```

`StorageService` 接口：

```typescript
class StorageService {
  async upload(bucket: string, key: string, buffer: Buffer, mimeType: string): Promise<string>
  async getSignedUrl(bucket: string, key: string, expiresInSeconds?: number): Promise<string>
  async delete(bucket: string, key: string): Promise<void>
  async ensureBucket(bucket: string): Promise<void>
}
```

Storage Key 命名：`receipts/{ledgerId}/{YYYY}/{MM}/{uuid}.{ext}`

### 3.3 依赖与配置

依赖：`@aws-sdk/client-s3`、`@aws-sdk/s3-request-presigner`

环境变量：

```env
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_REGION=us-east-1
STORAGE_RECEIPT_BUCKET=bookkeeping-receipts
```

设计决策：使用 AWS S3 SDK 而非 MinIO 专用 SDK，未来迁移云 OSS 只改环境变量。

---

## 4. BullMQ 异步队列 + OCR Worker

### 4.1 全局队列模块

```
apps/api/src/queue/
  queue.module.ts
```

```typescript
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', '127.0.0.1'),
          port: config.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),
  ],
})
export class QueueModule {}
```

环境变量：

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 4.2 OCR 队列与 Worker

```
apps/api/src/ai/
  ocr-queue.constants.ts
  ocr-queue.processor.ts
```

Job Data：

```typescript
interface OcrJobData {
  taskId: string;
  ledgerId: string;
  userId: string;
  storageKey: string;
  mimeType: string;
}
```

Processor 流程：

```
1. 更新 ai_task.status → processing
2. StorageService.getSignedUrl() 生成临时 URL
3. 获取账本上下文（timezone, currency, categories, accounts）
4. AiInternalClient.parseReceiptOcr(signedUrl, context)
5. 保存 ai_extraction
6. 更新 ai_task.status → succeeded
7. 异常 → ai_task.status → failed + errorMessage
```

BullMQ 配置：

| 配置项 | 值 |
|--------|-----|
| 重试次数 | 2 |
| 重试延迟 | 指数退避 5s, 15s |
| 任务超时 | 60s |
| 并发数 | 2 |

---

## 5. NestJS 端上传 + OCR 端点

### 5.1 新增 API

```
POST /ledgers/:ledgerId/ai/receipt-ocr
Content-Type: multipart/form-data
字段: file（单张图片）

响应 202 Accepted:
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "ledgerId": "uuid",
    "status": "pending",
    "type": "receipt_ocr"
  }
}
```

### 5.2 Service 流程（submitReceiptOcr）

```
1. canCreateTransaction 权限检查
2. 生成 storageKey
3. StorageService.upload() 上传到 MinIO
4. AiRepository 创建 ai_task (type: receipt_ocr, status: pending, inputFileUrl: storageKey)
5. BullMQ 投递 OcrJobData
6. 返回 { taskId, ledgerId, status: 'pending', type: 'receipt_ocr' }
```

### 5.3 文件校验

白名单 MIME type：`image/jpeg`、`image/png`、`image/webp`。大小上限 10MB。

### 5.4 AiInternalClient 新增

```typescript
async parseReceiptOcr(params: {
  taskId: string;
  ledgerId: string;
  userId: string;
  signedUrl: string;
  mimeType: string;
  locale: string;
  timezone: string;
  defaultCurrency: string;
  context: { categoryNames: string[]; accountHints: string[] };
}): Promise<InternalAiOcrResult>
```

超时：30s（OCR 耗时比文本解析更长）。

### 5.5 确认流程扩展

现有 `confirmExtraction()` 复用 + 扩展：

```
如果 ai_task.type === 'receipt_ocr' && ai_task.inputFileUrl 存在：
  → 同一事务内创建 TransactionAttachment
  → storageKey = ai_task.inputFileUrl
  → fileType = 从 storageKey 推断
```

---

## 6. FastAPI OCR 端点 + Tesseract 引擎

### 6.1 新增文件

```
apps/ai-service/app/
  api/routes/receipt_ocr.py
  schemas/receipt_ocr.py
  services/receipt_ocr_service.py
  providers/ocr_provider.py
  providers/tesseract_provider.py
tests/
  test_receipt_ocr.py
```

### 6.2 OCR Provider 抽象

```python
class OcrProvider(ABC):
    @abstractmethod
    async def extract_text(self, image_bytes: bytes, mime_type: str) -> list[str]:
        """从图片中提取文字块列表"""
        ...
```

Tesseract 实现：`pytesseract.image_to_string(image, lang='chi_sim+eng')`

### 6.3 OCR 业务编排

```python
async def parse_receipt(request: ReceiptOcrRequest) -> ReceiptOcrResponse:
    # 1. 从 signed_url 下载图片
    # 2. OcrProvider.extract_text() → text_blocks
    # 3. 从 text_blocks 提取结构化信息：
    #    - 金额：正则匹配 "合计"/"总计"/"¥" 后的数字
    #    - 商户：首行或包含 "店"/"餐厅"/"超市" 的行
    #    - 日期：匹配日期格式
    #    - 明细行：匹配 "名称 x数量 金额" 模式 → receipt.items
    # 4. context.category_names 匹配分类
    # 5. 计算 confidence（基础 0.80，有金额 +0.05，有商户 +0.05，有明细 +0.05）
    # 6. 返回 ReceiptOcrResponse
```

### 6.4 系统依赖

```bash
# macOS
brew install tesseract tesseract-lang
# Python
uv add pytesseract Pillow httpx
```

---

## 7. 共享包 + API Client

### 7.1 `packages/shared-types` 新增

```typescript
export interface ReceiptOcrAcceptedResult {
  taskId: string;
  ledgerId: string;
  status: 'pending';
  type: 'receipt_ocr';
}

export interface TransactionAttachment {
  id: string;
  transactionId: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}
```

### 7.2 `packages/api-client` 新增

```typescript
async receiptOcr(
  ledgerId: string,
  file: File | Blob,
): Promise<ApiResponse<ReceiptOcrAcceptedResult>>
```

新增内部 `requestMultipart()` 方法支持 FormData 上传。

### 7.3 Admin Web

无新页面。现有 AI 任务列表已支持 `receipt_ocr` 类型筛选。

---

## 8. 安全与错误处理

### 8.1 安全规则

- 权限：复用 `canCreateTransaction` Policy
- 文件校验：Multer 白名单 + 10MB 上限
- 存储隔离：storage key 包含 `ledgerId`
- Signed URL：1 小时过期
- 日志脱敏：审计日志只记录 storageKey 前 8 字符
- FastAPI 隔离：只通过 signed URL 访问图片，无 MinIO 凭证

### 8.2 错误码

| 错误码 | 场景 |
|--------|------|
| `VALIDATION_FAILED` | 文件格式/大小不合法 |
| `AI_OCR_FAILED` | OCR 识别失败 |
| `AI_PROVIDER_TIMEOUT` | FastAPI 调用超时（30s） |
| `AI_PROVIDER_UNAVAILABLE` | FastAPI 不可达 |
| `STORAGE_UPLOAD_FAILED` | MinIO 上传失败 |

### 8.3 审计日志

| 操作 | 触发点 |
|------|--------|
| `ai_task.created` | submitReceiptOcr 成功后 |
| `ai_extraction.confirmed` | 确认候选（复用现有） |
| `ai_extraction.rejected` | 拒绝候选（复用现有） |

---

## 9. 测试与验证

### 9.1 单元测试

| 测试 | 覆盖 |
|------|------|
| `storage.service.spec.ts` | Mock S3Client，upload / getSignedUrl / delete |
| `ai.service.spec.ts`（扩展） | submitReceiptOcr 权限、上传、任务创建、队列投递 |
| `ocr-queue.processor.spec.ts` | Worker 成功/失败/重试路径 |
| `ai-internal-client.spec.ts`（扩展） | parseReceiptOcr 请求构造、超时、响应校验 |
| `test_receipt_ocr.py` | FastAPI 契约测试，Mock Tesseract |

### 9.2 端到端验证

新增 `pnpm e2e:m5:receipt-ocr`：

```
1. 确认 NestJS + FastAPI + MinIO + Redis 均在运行
2. 注册/登录
3. 创建账本 + 账户 + 分类
4. 上传测试票据 → POST /ledgers/:id/ai/receipt-ocr
5. 轮询 GET /ai/tasks/:taskId 直到 succeeded/failed
6. 确认候选 → 验证交易创建 + 附件记录
7. 输出摘要
```

### 9.3 本地联调前提

```
✅ PostgreSQL（已有）
✅ Redis（已有 Docker）
✅ NestJS API（已有）
✅ FastAPI AI Service（已有）
🆕 MinIO（Docker 安装，需用户执行）
🆕 Tesseract（brew 安装，需用户执行）
```

---

## 10. 不在 M5 范围

- 移动端页面
- M6 AI 财务问答
- 批量上传多张票据
- PDF 票据解析
- 票据原图查看详情页
- 云 OCR API 接入（后续可替换 Tesseract）

---

## 11. 文件变更清单

### 新建

| 文件 | 用途 |
|------|------|
| `apps/api/src/storage/storage.module.ts` | 存储模块 |
| `apps/api/src/storage/storage.service.ts` | MinIO 对象 CRUD |
| `apps/api/src/storage/storage.constants.ts` | 存储常量 |
| `apps/api/src/queue/queue.module.ts` | 全局 BullMQ 模块 |
| `apps/api/src/ai/ocr-queue.constants.ts` | OCR 队列常量 |
| `apps/api/src/ai/ocr-queue.processor.ts` | OCR Worker |
| `apps/api/src/ai/dto/receipt-ocr-file.filter.ts` | 文件类型校验 |
| `apps/ai-service/app/api/routes/receipt_ocr.py` | FastAPI OCR 路由 |
| `apps/ai-service/app/schemas/receipt_ocr.py` | Pydantic 模型 |
| `apps/ai-service/app/services/receipt_ocr_service.py` | OCR 业务编排 |
| `apps/ai-service/app/providers/ocr_provider.py` | OCR 引擎抽象 |
| `apps/ai-service/app/providers/tesseract_provider.py` | Tesseract 实现 |
| `docs/modules/ai/票据OCR与文件说明.md` | M5 中文模块文档 |
| `scripts/e2e-m5-receipt-ocr.sh` | 端到端验证脚本 |

### 修改

| 文件 | 变更 |
|------|------|
| `apps/api/prisma/schema.prisma` | 新增 TransactionAttachment 模型 + Transaction 关系 |
| `apps/api/src/ai/ai.module.ts` | 注册 BullMQ 队列、导入 StorageModule |
| `apps/api/src/ai/ai.controller.ts` | 新增 receiptOcr 端点 |
| `apps/api/src/ai/ai.service.ts` | 新增 submitReceiptOcr、扩展 confirmExtraction |
| `apps/api/src/ai/ai.repository.ts` | 新增 createTransactionAttachment |
| `apps/api/src/ai/ai-internal-client.ts` | 新增 parseReceiptOcr 方法 |
| `apps/api/src/app.module.ts` | 导入 QueueModule |
| `apps/api/package.json` | 新增 BullMQ、S3 SDK 依赖 |
| `apps/ai-service/app/main.py` | 注册 OCR 路由 |
| `packages/shared-types/src/index.ts` | 新增 OCR 类型 |
| `packages/api-client/src/index.ts` | 新增 receiptOcr 方法 + requestMultipart |
| `package.json` | 新增 e2e:m5:receipt-ocr 脚本 |
| `docker-compose.yml` | 新增 MinIO 服务 |
| `.env.example` | 新增 MinIO、Redis 环境变量 |
