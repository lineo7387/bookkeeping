import { Inject, Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
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
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBucket(this.getReceiptBucketName());
  }

  getReceiptBucketName(): string {
    return this.configService.get<string>('STORAGE_RECEIPT_BUCKET') ?? 'bookkeeping-receipts';
  }

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
