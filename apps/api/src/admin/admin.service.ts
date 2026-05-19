import { Injectable } from '@nestjs/common';
import type {
  AdminAiTaskSummary,
  AdminAuditLogSummary,
  AdminLedgerSummary,
  AdminUserSummary,
  PaginatedItems,
} from '@bookkeeping/shared-types';
import { AdminRepository } from './admin.repository';
import type { ListAdminQueryDto } from './dto/list-admin-query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  listUsers(query: ListAdminQueryDto): Promise<PaginatedItems<AdminUserSummary>> {
    return this.adminRepository.listUsers(normalizeQuery(query));
  }

  listLedgers(query: ListAdminQueryDto): Promise<PaginatedItems<AdminLedgerSummary>> {
    return this.adminRepository.listLedgers(normalizeQuery(query));
  }

  async listAiTasks(query: ListAdminQueryDto): Promise<PaginatedItems<AdminAiTaskSummary>> {
    const normalized = normalizeQuery(query);
    return { items: [], limit: normalized.limit, offset: normalized.offset };
  }

  listAuditLogs(query: ListAdminQueryDto): Promise<PaginatedItems<AdminAuditLogSummary>> {
    return this.adminRepository.listAuditLogs(normalizeQuery(query));
  }
}

function normalizeQuery(query: ListAdminQueryDto): Required<ListAdminQueryDto> {
  return {
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
  };
}
