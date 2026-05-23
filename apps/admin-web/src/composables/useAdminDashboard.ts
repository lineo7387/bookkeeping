import { computed, readonly, shallowRef } from 'vue'
import {
  adminAiTaskStatusOptions,
  adminAiTaskTypeOptions,
  createDashboardViewModel,
  createEmptyDashboardViewModel,
  defaultAdminAiTaskFilters,
  type AdminAiTaskFilters,
  type AdminAiTaskStatusFilter,
  type AdminAiTaskTypeFilter,
  type DashboardViewModel,
} from '../services/adminDashboard'
import { fetchAdminDashboardData } from '../services/adminApi'

export function useAdminDashboard() {
  const dashboardData = shallowRef<DashboardViewModel>(createEmptyDashboardViewModel())
  const aiTaskFilters = shallowRef<AdminAiTaskFilters>({ ...defaultAdminAiTaskFilters })
  const isLoading = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  const lastLoadedAt = shallowRef<string | null>(null)

  const hasActivities = computed(() => dashboardData.value.activities.length > 0)
  const activeAiTaskFilterCount = computed(() =>
    Number(aiTaskFilters.value.status !== 'all') + Number(aiTaskFilters.value.type !== 'all'),
  )

  async function refresh() {
    isLoading.value = true
    errorMessage.value = null

    try {
      const data = await fetchAdminDashboardData(aiTaskFilters.value)
      dashboardData.value = createDashboardViewModel(data)
      lastLoadedAt.value = new Date().toISOString()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '后台数据加载失败'
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

  return {
    viewModel: readonly(dashboardData),
    aiTaskFilters: readonly(aiTaskFilters),
    aiTaskStatusOptions: adminAiTaskStatusOptions,
    aiTaskTypeOptions: adminAiTaskTypeOptions,
    activeAiTaskFilterCount,
    isLoading: readonly(isLoading),
    errorMessage: readonly(errorMessage),
    lastLoadedAt: readonly(lastLoadedAt),
    hasActivities,
    refresh,
    updateAiTaskStatusFilter,
    updateAiTaskTypeFilter,
  }
}
