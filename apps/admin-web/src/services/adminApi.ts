import type { BookkeepingApiClient } from '@bookkeeping/api-client'
import type {
  AdminAiTaskSummary,
  AdminAuditLogSummary,
  AdminLedgerSummary,
  AdminUserSummary,
  ApiResponse,
  PaginatedItems,
} from '@bookkeeping/shared-types'
import { adminApiClient } from './apiClient'
import { createAdminAiTaskQuery, defaultAdminAiTaskFilters, type AdminAiTaskFilters } from './adminDashboard'

export interface AdminDashboardData {
  users: PaginatedItems<AdminUserSummary>
  ledgers: PaginatedItems<AdminLedgerSummary>
  aiTasks: PaginatedItems<AdminAiTaskSummary>
  auditLogs: PaginatedItems<AdminAuditLogSummary>
}

export async function fetchAdminDashboardData(
  aiTaskFilters: AdminAiTaskFilters = defaultAdminAiTaskFilters,
  client: BookkeepingApiClient = adminApiClient,
): Promise<AdminDashboardData> {
  const query = { limit: 20, offset: 0 }
  const aiTaskQuery = createAdminAiTaskQuery(aiTaskFilters)
  const [users, ledgers, aiTasks, auditLogs] = await Promise.all([
    client.listAdminUsers(query),
    client.listAdminLedgers(query),
    client.listAdminAiTasks(aiTaskQuery),
    client.listAdminAuditLogs(query),
  ])

  return {
    users: unwrapApiResponse(users, '用户列表'),
    ledgers: unwrapApiResponse(ledgers, '账本列表'),
    aiTasks: unwrapApiResponse(aiTasks, 'AI 任务列表'),
    auditLogs: unwrapApiResponse(auditLogs, '审计日志'),
  }
}

export async function fetchAdminAiTasksData(
  aiTaskFilters: AdminAiTaskFilters = defaultAdminAiTaskFilters,
  client: BookkeepingApiClient = adminApiClient,
): Promise<PaginatedItems<AdminAiTaskSummary>> {
  return unwrapApiResponse(await client.listAdminAiTasks(createAdminAiTaskQuery(aiTaskFilters)), 'AI 任务列表')
}

function unwrapApiResponse<T>(response: ApiResponse<T>, label: string): T {
  if (response.success) {
    return response.data
  }

  throw new Error(`${label}加载失败：${response.error.message}`)
}
