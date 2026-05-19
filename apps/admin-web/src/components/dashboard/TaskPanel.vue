<script setup lang="ts">
defineProps<{
  tasks: ReadonlyArray<{
    title: string
    detail: string
    status: 'warning' | 'info' | 'success'
  }>
}>()
</script>

<template>
  <section class="panel rounded-[28px] border border-white/70 p-5" aria-labelledby="task-panel-title">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">待处理</p>
        <h2 id="task-panel-title" class="m-0 font-['Nunito'] text-2xl font-black text-[var(--clay-foreground)]">工作队列</h2>
      </div>
      <span class="panel-count grid h-11 w-11 place-items-center rounded-[18px] font-black text-[var(--clay-violet)]">
        {{ tasks.length }}
      </span>
    </div>

    <ul class="mt-5 grid list-none gap-3.5 p-0">
      <li v-for="task in tasks" :key="task.title" class="flex min-w-0 items-start gap-3.5 rounded-[24px] bg-white/60 p-4">
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
