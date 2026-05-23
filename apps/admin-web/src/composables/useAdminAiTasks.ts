import { computed, onMounted, readonly, shallowRef } from 'vue'
import { fetchAdminAiTasksData } from '../services/adminApi'
import {
  adminAiTaskStatusOptions,
  adminAiTaskTypeOptions,
  defaultAdminAiTaskFilters,
  type AdminAiTaskFilters,
  type AdminAiTaskStatusFilter,
  type AdminAiTaskTypeFilter,
} from '../services/adminDashboard'
import { createAdminAiTaskListViewModel, type AdminAiTaskListViewModel } from '../services/adminAiTasks'

const emptyAiTaskListViewModel: AdminAiTaskListViewModel = {
  rows: [],
  resultCount: 0,
  limit: 20,
  offset: 0,
  summary: '等待加载 AI 任务',
}

export function useAdminAiTasks() {
  const viewModel = shallowRef<AdminAiTaskListViewModel>(emptyAiTaskListViewModel)
  const aiTaskFilters = shallowRef<AdminAiTaskFilters>({ ...defaultAdminAiTaskFilters })
  const isLoading = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  const lastLoadedAt = shallowRef<string | null>(null)

  const activeAiTaskFilterCount = computed(() =>
    Number(aiTaskFilters.value.status !== 'all') + Number(aiTaskFilters.value.type !== 'all'),
  )

  async function refresh() {
    isLoading.value = true
    errorMessage.value = null

    try {
      const data = await fetchAdminAiTasksData(aiTaskFilters.value)
      viewModel.value = createAdminAiTaskListViewModel(data)
      lastLoadedAt.value = new Date().toISOString()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'AI 任务加载失败'
    } finally {
      isLoading.value = false
    }
  }

  async function updateAiTaskStatusFilter(status: AdminAiTaskStatusFilter) {
    aiTaskFilters.value = {
      ...aiTaskFilters.value,
      status,
    }

    await refresh()
  }

  async function updateAiTaskTypeFilter(type: AdminAiTaskTypeFilter) {
    aiTaskFilters.value = {
      ...aiTaskFilters.value,
      type,
    }

    await refresh()
  }

  onMounted(() => {
    void refresh()
  })

  return {
    viewModel: readonly(viewModel),
    aiTaskFilters: readonly(aiTaskFilters),
    aiTaskStatusOptions: adminAiTaskStatusOptions,
    aiTaskTypeOptions: adminAiTaskTypeOptions,
    activeAiTaskFilterCount,
    isLoading: readonly(isLoading),
    errorMessage: readonly(errorMessage),
    lastLoadedAt: readonly(lastLoadedAt),
    refresh,
    updateAiTaskStatusFilter,
    updateAiTaskTypeFilter,
  }
}
