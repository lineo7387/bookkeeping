import type { AdminAiTaskSummary, PaginatedItems } from '@bookkeeping/shared-types'
import { createAdminAiTaskListViewModel } from './adminAiTasks'

const aiTasks: PaginatedItems<AdminAiTaskSummary> = {
  items: [
    {
      id: 'task_1',
      status: 'succeeded',
      type: 'text_parse',
      createdAt: '2026-05-23T00:00:00.000Z',
      updatedAt: '2026-05-23T00:01:00.000Z',
    },
  ],
  limit: 20,
  offset: 0,
}

export const adminAiTaskListViewModelTypeCheck = createAdminAiTaskListViewModel(aiTasks)
export const adminAiTaskListFirstRowTypeCheck = adminAiTaskListViewModelTypeCheck.rows[0]
