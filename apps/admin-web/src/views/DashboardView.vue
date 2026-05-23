<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Bot, CircleDollarSign, DatabaseZap, Users } from 'lucide-vue-next'
import { useAdminDashboard } from '../composables/useAdminDashboard'
import AdminShell from '../components/layout/AdminShell.vue'
import ActivityPanel from '../components/dashboard/ActivityPanel.vue'
import StatCard from '../components/dashboard/StatCard.vue'
import TaskPanel from '../components/dashboard/TaskPanel.vue'
import type { DashboardStatItem } from '../services/adminDashboard'
import type { AdminShellView } from '../types/adminNavigation'

defineEmits<{
  logout: []
  navigate: [view: AdminShellView]
}>()

const statIcons = {
  users: Users,
  ledgers: CircleDollarSign,
  aiTasks: Bot,
  auditLogs: DatabaseZap,
} satisfies Record<DashboardStatItem['key'], typeof Users>

const {
  viewModel,
  aiTaskFilters,
  aiTaskStatusOptions,
  aiTaskTypeOptions,
  activeAiTaskFilterCount,
  isLoading,
  errorMessage,
  lastLoadedAt,
  refresh,
  updateAiTaskStatusFilter,
  updateAiTaskTypeFilter,
} = useAdminDashboard()

const stats = computed(() =>
  viewModel.value.stats.map((stat) => ({
    ...stat,
    icon: statIcons[stat.key],
  })),
)

const lastLoadedLabel = computed(() => {
  if (!lastLoadedAt.value) {
    return '尚未加载'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(lastLoadedAt.value))
})

onMounted(() => {
  void refresh()
})
</script>

<template>
  <AdminShell
    active-view="dashboard"
    eyebrow="M3/M4 后台只读 API"
    title="运营总览"
    :last-loaded-label="lastLoadedLabel"
    :is-loading="isLoading"
    @logout="$emit('logout')"
    @refresh="refresh"
    @navigate="$emit('navigate', $event)"
  >
    <section class="status-panel grid grid-cols-[minmax(0,1fr)_280px] gap-5 rounded-[28px] border border-white/70 p-5 max-[860px]:grid-cols-1" aria-labelledby="hero-title">
      <div class="grid content-center gap-3">
        <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">用户 · 账本 · AI 任务 · 审计日志</p>
        <h2 id="hero-title" class="m-0 max-w-[720px] font-['Nunito'] text-[30px] leading-tight font-black text-[var(--clay-foreground)] max-[560px]:text-2xl">
          {{ errorMessage ? 'Admin API 连接需要检查' : '后台已接入真实只读数据' }}
        </h2>
        <p class="m-0 max-w-[720px] text-base font-medium text-[var(--clay-muted)]">
          {{ errorMessage ?? '页面通过 @bookkeeping/api-client 访问 NestJS Admin API，当前展示首屏分页样本，不直接访问 FastAPI 或内部服务。' }}
        </p>
      </div>
      <div class="status-stack grid gap-3">
        <div v-for="item in viewModel.healthItems" :key="item.label" class="status-row">
          <span class="status-dot" :class="`status-dot-${item.tone}`" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-4 gap-[18px] max-[860px]:grid-cols-2 max-[560px]:grid-cols-1" aria-label="关键指标">
      <StatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :hint="stat.hint"
        :tone="stat.tone"
        :icon="stat.icon"
      />
    </section>

    <section class="grid grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-6 max-[860px]:grid-cols-1">
      <TaskPanel
        :tasks="viewModel.tasks"
        :task-count="viewModel.taskResultCount"
        :selected-status="aiTaskFilters.status"
        :selected-type="aiTaskFilters.type"
        :status-options="aiTaskStatusOptions"
        :type-options="aiTaskTypeOptions"
        :active-filter-count="activeAiTaskFilterCount"
        :is-loading="isLoading"
        @status-change="updateAiTaskStatusFilter"
        @type-change="updateAiTaskTypeFilter"
      />
      <ActivityPanel :activities="viewModel.activities" />
    </section>
  </AdminShell>
</template>

<style scoped>
.status-panel {
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    10px 14px 30px rgba(160, 150, 180, 0.14),
    -8px -8px 20px rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
}

.status-row {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.58);
  padding: 0 12px;
  color: var(--clay-muted);
  font-size: 14px;
  font-weight: 700;
}

.status-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.status-dot-green {
  background: var(--clay-green);
}

.status-dot-blue {
  background: var(--clay-blue);
}

.status-dot-violet {
  background: var(--clay-violet);
}
</style>
