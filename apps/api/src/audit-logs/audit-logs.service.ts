import { Injectable } from '@nestjs/common';
import { AuditLogsRepository, type AuditLogCreateData } from './audit-logs.repository';

const SENSITIVE_METADATA_KEYS = new Set(['password', 'passwordHash', 'refreshToken', 'refreshTokenHash', 'token']);

@Injectable()
export class AuditLogsService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async record(data: AuditLogCreateData) {
    return this.auditLogsRepository.create({
      ...data,
      metadata: sanitizeMetadata(data.metadata),
    });
  }
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !SENSITIVE_METADATA_KEYS.has(key)));
}
