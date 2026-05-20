import type { AdminAiTaskSummary, AdminAuditLogSummary } from '@bookkeeping/shared-types'
import type { AdminDashboardData } from './adminApi'

export type DashboardTone = 'violet' | 'blue' | 'pink' | 'green'
export type DashboardTaskStatus = 'warning' | 'info' | 'success'

export interface DashboardStatItem {
  key: 'users' | 'ledgers' | 'aiTasks' | 'auditLogs'
  label: string
  value: string
  hint: string
  tone: DashboardTone
}

export interface DashboardTaskItem {
  title: string
  detail: string
  status: DashboardTaskStatus
}

export interface DashboardActivityItem {
  actor: string
  action: string
  time: string
}

export interface DashboardHealthItem {
  tone: 'green' | 'blue' | 'violet'
  label: string
}

export interface DashboardViewModel {
  stats: DashboardStatItem[]
  tasks: DashboardTaskItem[]
  activities: DashboardActivityItem[]
  healthItems: DashboardHealthItem[]
}

export function createDashboardViewModel(data: AdminDashboardData): DashboardViewModel {
  const systemAdminCount = data.users.items.filter((user) => user.isSystemAdmin).length
  const familyLedgerCount = data.ledgers.items.filter((ledger) => ledger.type === 'family').length
  const pendingAiTaskCount = data.aiTasks.items.filter((task) =>
    task.status === 'pending' || task.status === 'processing',
  ).length

  return {
    stats: [
      {
        key: 'users',
        label: '用户样本',
        value: formatCount(data.users.items.length),
        hint: `系统管理员 ${systemAdminCount}`,
        tone: 'violet',
      },
      {
        key: 'ledgers',
        label: '账本样本',
        value: formatCount(data.ledgers.items.length),
        hint: `家庭账本 ${familyLedgerCount}`,
        tone: 'blue',
      },
      {
        key: 'aiTasks',
        label: 'AI任务',
        value: formatCount(data.aiTasks.items.length),
        hint: pendingAiTaskCount > 0 ? `处理中 ${pendingAiTaskCount}` : '真实摘要',
        tone: 'pink',
      },
      {
        key: 'auditLogs',
        label: '审计活动',
        value: formatCount(data.auditLogs.items.length),
        hint: `最近 ${data.auditLogs.items.length} 条`,
        tone: 'green',
      },
    ],
    tasks: createTaskItems(data.aiTasks.items),
    activities: createActivityItems(data.auditLogs.items),
    healthItems: [
      { tone: 'green', label: 'NestJS Admin API 已接入' },
      { tone: 'blue', label: '后台 Web 仅调用对外 API' },
      { tone: 'violet', label: 'AI 任务读取真实摘要' },
    ],
  }
}

export function createEmptyDashboardViewModel(): DashboardViewModel {
  return {
    stats: [
      { key: 'users', label: '用户样本', value: '0', hint: '等待加载', tone: 'violet' },
      { key: 'ledgers', label: '账本样本', value: '0', hint: '等待加载', tone: 'blue' },
      { key: 'aiTasks', label: 'AI任务', value: '0', hint: '等待加载', tone: 'pink' },
      { key: 'auditLogs', label: '审计活动', value: '0', hint: '等待加载', tone: 'green' },
    ],
    tasks: [
      {
        title: '等待后台接口',
        detail: '页面会从 NestJS Admin API 拉取用户、账本、AI 任务和审计日志。',
        status: 'info',
      },
    ],
    activities: [],
    healthItems: [
      { tone: 'blue', label: '准备连接 Admin API' },
      { tone: 'violet', label: '需要系统管理员 access token' },
      { tone: 'green', label: '页面使用统一 api-client' },
    ],
  }
}

function createTaskItems(items: AdminAiTaskSummary[]): DashboardTaskItem[] {
  if (items.length === 0) {
    return [
      {
        title: '暂无 AI 任务',
        detail: '后台已接通 /admin/ai/tasks，当前没有可展示的 AI 任务摘要。',
        status: 'success',
      },
    ]
  }

  return items.slice(0, 5).map((task) => ({
    title: `${task.type} · ${task.status}`,
    detail: `创建于 ${formatDateTime(task.createdAt)}，最后更新 ${formatDateTime(task.updatedAt)}。`,
    status: toTaskStatus(task.status),
  }))
}

function createActivityItems(items: AdminAuditLogSummary[]): DashboardActivityItem[] {
  return items.slice(0, 6).map((activity) => ({
    actor: activity.actorUserId ?? '系统',
    action: `${activity.summary} · ${activity.action}`,
    time: formatDateTime(activity.createdAt),
  }))
}

function toTaskStatus(status: AdminAiTaskSummary['status']): DashboardTaskStatus {
  if (status === 'failed') {
    return 'warning'
  }

  if (status === 'pending' || status === 'processing') {
    return 'info'
  }

  return 'success'
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
