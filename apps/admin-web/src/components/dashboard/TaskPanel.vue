<script setup lang="ts">
import { ListFilter } from 'lucide-vue-next'
import type {
  AdminAiTaskStatusFilter,
  AdminAiTaskTypeFilter,
} from '../../services/adminDashboard'

defineProps<{
  tasks: ReadonlyArray<{
    title: string
    detail: string
    status: 'warning' | 'info' | 'success'
  }>
  taskCount: number
  selectedStatus: AdminAiTaskStatusFilter
  selectedType: AdminAiTaskTypeFilter
  statusOptions: ReadonlyArray<{ value: AdminAiTaskStatusFilter; label: string }>
  typeOptions: ReadonlyArray<{ value: AdminAiTaskTypeFilter; label: string }>
  activeFilterCount: number
  isLoading: boolean
}>()

defineEmits<{
  statusChange: [status: AdminAiTaskStatusFilter]
  typeChange: [type: AdminAiTaskTypeFilter]
}>()
</script>

<template>
  <section class="panel rounded-[28px] border border-white/70 p-5" aria-labelledby="task-panel-title">
    <div class="flex items-start justify-between gap-4 max-[560px]:flex-col">
      <div>
        <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">待处理</p>
        <h2 id="task-panel-title" class="m-0 font-['Nunito'] text-2xl font-black text-[var(--clay-foreground)]">工作队列</h2>
      </div>
      <div class="flex items-center gap-2">
        <span class="filter-count inline-flex min-h-9 items-center gap-1.5 rounded-[14px] px-3 text-xs font-black text-[var(--clay-violet)]">
          <ListFilter :size="15" aria-hidden="true" />
          {{ activeFilterCount }}
        </span>
        <span class="panel-count grid h-11 w-11 place-items-center rounded-[18px] font-black text-[var(--clay-violet)]">
          {{ taskCount }}
        </span>
      </div>
    </div>

    <div class="mt-5 grid gap-3" aria-label="AI 任务筛选">
      <div class="filter-group" role="group" aria-label="任务状态">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          class="filter-button"
          :class="{ 'filter-button-active': option.value === selectedStatus }"
          type="button"
          :disabled="isLoading"
          @click="$emit('statusChange', option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="filter-group" role="group" aria-label="任务类型">
        <button
          v-for="option in typeOptions"
          :key="option.value"
          class="filter-button"
          :class="{ 'filter-button-active': option.value === selectedType }"
          type="button"
          :disabled="isLoading"
          @click="$emit('typeChange', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <ul class="mt-5 grid list-none gap-3.5 p-0">
      <li v-for="task in tasks" :key="`${task.title}-${task.detail}`" class="flex min-w-0 items-start gap-3.5 rounded-[24px] bg-white/60 p-4">
        <span class="mt-[7px] h-3 w-3 shrink-0 rounded-full" :class="`task-dot-${task.status}`" />
        <div>
          <h3 class="m-0 mb-1 font-['Nunito'] text-lg font-black text-[var(--clay-foreground)]">{{ task.title }}</h3>
          <p class="m-0 text-[var(--clay-muted)]">{{ task.detail }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    10px 14px 28px rgba(160, 150, 180, 0.14),
    -8px -8px 20px rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
}

.panel-count {
  background: var(--clay-pressed);
  box-shadow: var(--clay-shadow-pressed);
}

.filter-count {
  background: rgba(255, 255, 255, 0.68);
  box-shadow: var(--clay-shadow-pressed);
}

.filter-group {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-button {
  min-height: 38px;
  cursor: pointer;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.56);
  padding: 0 12px;
  color: var(--clay-muted);
  font-size: 13px;
  font-weight: 800;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.filter-button:hover:not(:disabled) {
  color: var(--clay-foreground);
  background: rgba(255, 255, 255, 0.82);
}

.filter-button-active {
  color: var(--clay-foreground);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 6px 8px 16px rgba(160, 150, 180, 0.14);
}

.filter-button:active:not(:disabled) {
  transform: scale(0.97);
}

.filter-button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.filter-button:focus-visible {
  outline: 4px solid rgba(124, 58, 237, 0.22);
  outline-offset: 2px;
}

.task-dot-warning {
  background: var(--clay-amber);
}

.task-dot-info {
  background: var(--clay-blue);
}

.task-dot-success {
  background: var(--clay-green);
}
</style>
