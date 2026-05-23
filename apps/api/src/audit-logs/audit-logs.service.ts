import { Injectable } from '@nestjs/common';
import {
  AuditLogsRepository,
  type AuditLogCreateData,
  type AuditLogTransactionClient,
} from './audit-logs.repository';

const SENSITIVE_METADATA_KEYS = new Set(['password', 'passwordHash', 'refreshToken', 'refreshTokenHash', 'token']);

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async record(data: AuditLogCreateData, tx?: AuditLogTransactionClient) {
    const sanitized = {
      ...data,
      metadata: sanitizeMetadata(data.metadata),
    };

    return tx ? this.auditLogsRepository.create(sanitized, tx) : this.auditLogsRepository.create(sanitized);
  }
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !SENSITIVE_METADATA_KEYS.has(key)));
}
