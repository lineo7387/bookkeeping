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
      markTaskSucceeded: jest.fn().mockResolvedValue({ id: 'task-1' } as any),
      markTaskFailed: jest.fn().mockResolvedValue({ id: 'task-1' } as any),
      createExtraction: jest.fn().mockResolvedValue({ id: 'ext-1' } as any),
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
      getReceiptBucketName: jest.fn().mockReturnValue('test-receipts'),
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
    expect(mockStorage.getSignedUrl).toHaveBeenCalledWith('test-receipts', 'receipts/test.jpg');
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
