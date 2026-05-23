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
