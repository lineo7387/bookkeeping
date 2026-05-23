import type { AiTaskStatus, AiTaskType, AdminAiTaskSummary, PaginatedItems } from '@bookkeeping/shared-types'

export type AdminAiTaskStatusTone = 'warning' | 'info' | 'success' | 'danger'

export interface AdminAiTaskListRow {
  id: string
  typeLabel: string
  statusLabel: string
  statusTone: AdminAiTaskStatusTone
  createdAtLabel: string
  updatedAtLabel: string
}

export interface AdminAiTaskListViewModel {
  rows: AdminAiTaskListRow[]
  resultCount: number
  limit: number
  offset: number
  summary: string
}

const statusLabels = {
  pending: '待处理',
  processing: '处理中',
  succeeded: '成功',
  failed: '失败',
} satisfies Record<AiTaskStatus, string>

const typeLabels = {
  text_parse: '文本记账',
  receipt_ocr: '票据识别',
  classify: '分类推荐',
  insight: '消费洞察',
} satisfies Record<AiTaskType, string>

export function createAdminAiTaskListViewModel(data: PaginatedItems<AdminAiTaskSummary>): AdminAiTaskListViewModel {
  return {
    rows: data.items.map(toAiTaskListRow),
    resultCount: data.items.length,
    limit: data.limit,
    offset: data.offset,
    summary: data.items.length > 0 ? `当前筛选返回 ${data.items.length} 条任务` : '当前筛选没有 AI 任务',
  }
}

function toAiTaskListRow(task: AdminAiTaskSummary): AdminAiTaskListRow {
  return {
    id: task.id,
    typeLabel: typeLabels[task.type],
    statusLabel: statusLabels[task.status],
    statusTone: toStatusTone(task.status),
    createdAtLabel: formatDateTime(task.createdAt),
    updatedAtLabel: formatDateTime(task.updatedAt),
  }
}

function toStatusTone(status: AiTaskStatus): AdminAiTaskStatusTone {
  if (status === 'failed') {
    return 'danger'
  }

  if (status === 'pending') {
    return 'warning'
  }

  if (status === 'processing') {
    return 'info'
  }

  return 'success'
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
