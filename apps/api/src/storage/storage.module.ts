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
