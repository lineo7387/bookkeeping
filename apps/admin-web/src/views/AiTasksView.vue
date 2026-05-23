<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Bot, CheckCircle2, DatabaseZap } from 'lucide-vue-next'
import AiTaskFilters from '../components/ai-tasks/AiTaskFilters.vue'
import AiTaskTable from '../components/ai-tasks/AiTaskTable.vue'
import AdminShell from '../components/layout/AdminShell.vue'
import { useAdminAiTasks } from '../composables/useAdminAiTasks'
import type { AdminShellView } from '../types/adminNavigation'

defineEmits<{
  logout: []
  navigate: [view: AdminShellView]
}>()

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
} = useAdminAiTasks()

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

const pageWindowLabel = computed(() => {
  if (viewModel.value.resultCount === 0) {
    return '0-0'
  }

  return `${viewModel.value.offset + 1}-${viewModel.value.offset + viewModel.value.rows.length}`
})

const summaryCards = computed(() => [
  {
    label: '筛选结果',
    value: String(viewModel.value.resultCount),
    hint: viewModel.value.summary,
    icon: Bot,
    tone: 'violet',
  },
  {
    label: '分页窗口',
    value: pageWindowLabel.value,
    hint: 'Admin API 首屏只读样本',
    icon: DatabaseZap,
    tone: 'blue',
  },
  {
    label: '边界状态',
    value: 'NestJS',
    hint: '后台 Web 不直接访问 FastAPI',
    icon: CheckCircle2,
    tone: 'green',
  },
])
</script>

<template>
  <AdminShell
    active-view="aiTasks"
    eyebrow="M4 AI 文本记账"
    title="AI 任务列表"
    :last-loaded-label="lastLoadedLabel"
    :is-loading="isLoading"
    @logout="$emit('logout')"
    @refresh="refresh"
    @navigate="$emit('navigate', $event)"
  >
    <section class="status-panel grid grid-cols-[minmax(0,1fr)_minmax(240px,320px)] gap-5 rounded-[28px] border border-white/70 p-5 max-[860px]:grid-cols-1">
      <div class="grid content-center gap-3">
        <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">/admin/ai/tasks</p>
        <h2 class="m-0 max-w-[720px] font-['Nunito'] text-[30px] leading-tight font-black text-[var(--clay-foreground)] max-[560px]:text-2xl">
          {{ errorMessage ? 'AI 任务列表需要检查' : '按状态和类型排查 AI 任务' }}
        </h2>
        <p class="m-0 max-w-[720px] text-base font-medium text-[var(--clay-muted)]">
          {{ errorMessage ?? '页面只读取系统管理员可见的脱敏任务摘要，适合排查 M4 文本记账任务状态，不展示输入原文或模型原始结果。' }}
        </p>
      </div>
      <div class="boundary-box rounded-[24px] p-4">
        <div class="mb-3 flex items-center gap-2 font-['Nunito'] text-lg font-black text-[var(--clay-foreground)]">
          <AlertTriangle :size="20" aria-hidden="true" />
          <span>隐私边界</span>
        </div>
        <p class="m-0 text-sm font-medium text-[var(--clay-muted)]">
          列表只展示任务 ID、状态、类型和时间，不展示完整输入文本、rawResult 或内部 FastAPI 地址。
        </p>
      </div>
    </section>

    <section class="grid grid-cols-3 gap-[18px] max-[860px]:grid-cols-1" aria-label="AI 任务摘要">
      <article v-for="card in summaryCards" :key="card.label" class="summary-card rounded-[24px] border border-white/70 p-4">
        <div class="mb-4 flex items-center justify-between gap-3">
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">{{ card.label }}</p>
          <span class="summary-icon grid h-10 w-10 place-items-center rounded-[16px]" :class="`summary-icon-${card.tone}`">
            <component :is="card.icon" :size="19" aria-hidden="true" />
          </span>
        </div>
        <p class="m-0 font-['Nunito'] text-2xl font-black text-[var(--clay-foreground)]">{{ card.value }}</p>
        <p class="mt-1 mb-0 text-sm font-medium text-[var(--clay-muted)]">{{ card.hint }}</p>
      </article>
    </section>

    <section class="grid grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)] gap-6 max-[960px]:grid-cols-1">
      <AiTaskFilters
        :selected-status="aiTaskFilters.status"
        :selected-type="aiTaskFilters.type"
        :status-options="aiTaskStatusOptions"
        :type-options="aiTaskTypeOptions"
        :active-filter-count="activeAiTaskFilterCount"
        :is-loading="isLoading"
        @status-change="updateAiTaskStatusFilter"
        @type-change="updateAiTaskTypeFilter"
      />
      <AiTaskTable :rows="viewModel.rows" :is-loading="isLoading" />
    </section>
  </AdminShell>
</template>

<style scoped>
.status-panel,
.summary-card {
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    10px 14px 30px rgba(160, 150, 180, 0.14),
    -8px -8px 20px rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
}

.boundary-box {
  background: var(--clay-pressed);
  box-shadow: var(--clay-shadow-pressed);
}

.summary-icon {
  color: white;
  box-shadow:
    8px 10px 18px rgba(124, 58, 237, 0.16),
    inset 3px 3px 6px rgba(255, 255, 255, 0.34);
}

.summary-icon-violet {
  background: linear-gradient(145deg, var(--clay-violet-soft), var(--clay-violet));
}

.summary-icon-blue {
  background: linear-gradient(145deg, #38bdf8, var(--clay-blue));
}

.summary-icon-green {
  background: linear-gradient(145deg, #34d399, var(--clay-green));
}
</style>
