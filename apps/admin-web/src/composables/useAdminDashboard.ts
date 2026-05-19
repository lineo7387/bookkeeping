import { computed, readonly, shallowRef } from 'vue'
import {
  createDashboardViewModel,
  createEmptyDashboardViewModel,
  type DashboardViewModel,
} from '../services/adminDashboard'
import { fetchAdminDashboardData } from '../services/adminApi'

export function useAdminDashboard() {
  const dashboardData = shallowRef<DashboardViewModel>(createEmptyDashboardViewModel())
  const isLoading = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  const lastLoadedAt = shallowRef<string | null>(null)

  const hasActivities = computed(() => dashboardData.value.activities.length > 0)

  async function refresh() {
    isLoading.value = true
    errorMessage.value = null

    try {
      const data = await fetchAdminDashboardData()
      dashboardData.value = createDashboardViewModel(data)
      lastLoadedAt.value = new Date().toISOString()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '后台数据加载失败'
    } finally {
      isLoading.value = false
    }
  }

  return {
    viewModel: readonly(dashboardData),
    isLoading: readonly(isLoading),
    errorMessage: readonly(errorMessage),
    lastLoadedAt: readonly(lastLoadedAt),
    hasActivities,
    refresh,
  }
}
