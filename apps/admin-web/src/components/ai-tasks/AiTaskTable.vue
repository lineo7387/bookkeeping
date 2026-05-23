<script setup lang="ts">
import { Bot, Clock3 } from 'lucide-vue-next'
import type { AdminAiTaskListRow } from '../../services/adminAiTasks'

defineProps<{
  rows: ReadonlyArray<AdminAiTaskListRow>
  isLoading: boolean
}>()
</script>

<template>
  <section class="table-panel rounded-[28px] border border-white/70 p-5" aria-labelledby="ai-task-table-title">
    <div class="flex items-start justify-between gap-4 max-[640px]:flex-col">
      <div>
        <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">只读摘要</p>
        <h2 id="ai-task-table-title" class="m-0 font-['Nunito'] text-2xl font-black text-[var(--clay-foreground)]">任务列表</h2>
      </div>
      <div class="summary-mark grid h-11 w-11 place-items-center rounded-[18px] text-[var(--clay-violet)]">
        <Bot :size="21" aria-hidden="true" />
      </div>
    </div>

    <div v-if="rows.length > 0" class="mt-5 grid gap-3">
      <article v-for="row in rows" :key="row.id" class="task-row grid grid-cols-[minmax(0,1fr)_140px_150px] gap-4 rounded-[22px] bg-white/60 p-4 max-[760px]:grid-cols-1">
        <div class="min-w-0">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="status-pill" :class="`status-pill-${row.statusTone}`">{{ row.statusLabel }}</span>
            <span class="type-pill">{{ row.typeLabel }}</span>
          </div>
          <p class="mt-3 mb-0 truncate font-mono text-xs font-bold text-[var(--clay-muted)]">{{ row.id }}</p>
        </div>
        <div class="time-cell">
          <Clock3 :size="16" aria-hidden="true" />
          <span>{{ row.createdAtLabel }}</span>
        </div>
        <div class="time-cell">
          <Clock3 :size="16" aria-hidden="true" />
          <span>{{ row.updatedAtLabel }}</span>
        </div>
      </article>
    </div>

    <div v-else class="empty-state mt-5 rounded-[24px] p-7 text-center">
      <p class="m-0 font-['Nunito'] text-xl font-black text-[var(--clay-foreground)]">
        {{ isLoading ? '正在读取 AI 任务' : '当前没有 AI 任务' }}
      </p>
      <p class="mx-auto mt-2 mb-0 max-w-[420px] text-sm font-medium text-[var(--clay-muted)]">
        {{ isLoading ? '请稍候，页面正在访问 NestJS Admin API。' : '调整状态或类型筛选后，可以继续查看文本记账任务摘要。' }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.table-panel {
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    10px 14px 28px rgba(160, 150, 180, 0.14),
    -8px -8px 20px rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
}

.summary-mark,
.empty-state {
  background: var(--clay-pressed);
  box-shadow: var(--clay-shadow-pressed);
}

.task-row {
  box-shadow:
    8px 10px 20px rgba(160, 150, 180, 0.1),
    -6px -6px 14px rgba(255, 255, 255, 0.74);
}

.status-pill,
.type-pill {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border-radius: 999px;
  padding: 0 11px;
  font-size: 12px;
  font-weight: 900;
}

.type-pill {
  color: var(--clay-violet);
  background: rgba(124, 58, 237, 0.1);
}

.status-pill-warning {
  color: #9a5c00;
  background: rgba(245, 158, 11, 0.16);
}

.status-pill-info {
  color: #076b99;
  background: rgba(14, 165, 233, 0.15);
}

.status-pill-success {
  color: #087a55;
  background: rgba(16, 185, 129, 0.16);
}

.status-pill-danger {
  color: #a21f52;
  background: rgba(219, 39, 119, 0.14);
}

.time-cell {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: var(--clay-muted);
  font-size: 13px;
  font-weight: 800;
}
</style>
