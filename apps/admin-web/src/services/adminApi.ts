import { createApiClient, type BookkeepingApiClient } from '@bookkeeping/api-client'
import type {
  AdminAiTaskSummary,
  AdminAuditLogSummary,
  AdminLedgerSummary,
  AdminUserSummary,
  ApiResponse,
  PaginatedItems,
} from '@bookkeeping/shared-types'

const adminAccessTokenStorageKey = 'bookkeeping_admin_access_token'

export interface AdminDashboardData {
  users: PaginatedItems<AdminUserSummary>
  ledgers: PaginatedItems<AdminLedgerSummary>
  aiTasks: PaginatedItems<AdminAiTaskSummary>
  auditLogs: PaginatedItems<AdminAuditLogSummary>
}

export const adminApiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  fetch: globalThis.fetch.bind(globalThis),
  getAccessToken: () => globalThis.localStorage?.getItem(adminAccessTokenStorageKey),
})

export async function fetchAdminDashboardData(
  client: BookkeepingApiClient = adminApiClient,
): Promise<AdminDashboardData> {
  const query = { limit: 20, offset: 0 }
  const [users, ledgers, aiTasks, auditLogs] = await Promise.all([
    client.listAdminUsers(query),
    client.listAdminLedgers(query),
    client.listAdminAiTasks(query),
    client.listAdminAuditLogs(query),
  ])

  return {
    users: unwrapApiResponse(users, '用户列表'),
    ledgers: unwrapApiResponse(ledgers, '账本列表'),
    aiTasks: unwrapApiResponse(aiTasks, 'AI 任务列表'),
    auditLogs: unwrapApiResponse(auditLogs, '审计日志'),
  }
}

function unwrapApiResponse<T>(response: ApiResponse<T>, label: string): T {
  if (response.success) {
    return response.data
  }

  throw new Error(`${label}加载失败：${response.error.message}`)
}
