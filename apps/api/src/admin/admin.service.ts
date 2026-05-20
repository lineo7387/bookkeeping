import { Injectable } from '@nestjs/common';
import type {
  AdminAiTaskSummary,
  AdminAuditLogSummary,
  AdminLedgerSummary,
  AdminUserSummary,
  PaginatedItems,
} from '@bookkeeping/shared-types';
import { AdminRepository } from './admin.repository';
import type { ListAdminAiTasksQueryDto, ListAdminQueryDto, NormalizedAdminQuery } from './dto/list-admin-query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  listUsers(query: ListAdminQueryDto): Promise<PaginatedItems<AdminUserSummary>> {
    return this.adminRepository.listUsers(normalizeQuery(query));
  }

  listLedgers(query: ListAdminQueryDto): Promise<PaginatedItems<AdminLedgerSummary>> {
    return this.adminRepository.listLedgers(normalizeQuery(query));
  }

  listAiTasks(query: ListAdminAiTasksQueryDto): Promise<PaginatedItems<AdminAiTaskSummary>> {
    return this.adminRepository.listAiTasks(normalizeQuery(query));
  }

  listAuditLogs(query: ListAdminQueryDto): Promise<PaginatedItems<AdminAuditLogSummary>> {
    return this.adminRepository.listAuditLogs(normalizeQuery(query));
  }
}

function normalizeQuery(query: ListAdminQueryDto | ListAdminAiTasksQueryDto): NormalizedAdminQuery {
  return {
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
    status: 'status' in query ? query.status : undefined,
    type: 'type' in query ? query.type : undefined,
  };
}
