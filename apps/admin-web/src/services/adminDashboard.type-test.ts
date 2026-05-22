import type {
  AiTaskStatus,
  AiTaskType,
  AdminAiTaskSummary,
  AdminAuditLogSummary,
  AdminLedgerSummary,
  AdminUserSummary,
  PaginatedItems,
} from '@bookkeeping/shared-types'
import { createAdminAiTaskQuery, createDashboardViewModel } from './adminDashboard'

const users: PaginatedItems<AdminUserSummary> = {
  items: [
    {
      id: 'user_1',
      email: 'lineo@example.com',
      phone: null,
      nickname: 'Lineo',
      status: 'active',
      isSystemAdmin: true,
      createdAt: '2026-05-19T00:00:00.000Z',
      updatedAt: '2026-05-19T00:00:00.000Z',
    },
  ],
  limit: 20,
  offset: 0,
}

const ledgers: PaginatedItems<AdminLedgerSummary> = {
  items: [
    {
      id: 'ledger_1',
      name: '家庭账本',
      type: 'family',
      ownerId: 'user_1',
      defaultCurrency: 'CNY',
      timezone: 'Asia/Shanghai',
      memberCount: 2,
      archivedAt: null,
      createdAt: '2026-05-19T00:00:00.000Z',
      updatedAt: '2026-05-19T00:00:00.000Z',
    },
  ],
  limit: 20,
  offset: 0,
}

const aiTasks: PaginatedItems<AdminAiTaskSummary> = {
  items: [],
  limit: 20,
  offset: 0,
}

const auditLogs: PaginatedItems<AdminAuditLogSummary> = {
  items: [
    {
      id: 'audit_1',
      actorUserId: 'user_1',
      ledgerId: 'ledger_1',
      targetType: 'transaction',
      targetId: 'transaction_1',
      action: 'transaction.create',
      summary: 'Created transaction',
      metadata: { amount: '86.00' },
      createdAt: '2026-05-19T00:00:00.000Z',
    },
  ],
  limit: 20,
  offset: 0,
}

export const adminDashboardViewModelTypeCheck = createDashboardViewModel({
  users,
  ledgers,
  aiTasks,
  auditLogs,
})

export const adminDashboardTaskResultCountTypeCheck =
  adminDashboardViewModelTypeCheck.taskResultCount

const statusFilter: AiTaskStatus = 'failed'
const typeFilter: AiTaskType = 'text_parse'

export const adminAiTaskFilteredQueryTypeCheck = createAdminAiTaskQuery({
  status: statusFilter,
  type: typeFilter,
})

export const adminAiTaskDefaultQueryTypeCheck = createAdminAiTaskQuery({
  status: 'all',
  type: 'all',
})
