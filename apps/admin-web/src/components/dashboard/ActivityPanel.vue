<script setup lang="ts">
defineProps<{
  activities: ReadonlyArray<{
    actor: string
    action: string
    time: string
  }>
}>()
</script>

<template>
  <section class="panel rounded-[28px] border border-white/70 p-5" aria-labelledby="activity-panel-title">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">审计</p>
        <h2 id="activity-panel-title" class="m-0 font-['Nunito'] text-2xl font-black text-[var(--clay-foreground)]">最近活动</h2>
      </div>
    </div>

    <p v-if="activities.length === 0" class="empty-state mt-5 rounded-[24px] bg-white/60 p-4 text-[var(--clay-muted)]">
      暂无审计活动，刷新后会展示最近的 Admin 审计日志。
    </p>

    <ol v-else class="mt-5 grid list-none gap-3.5 p-0">
      <li v-for="activity in activities" :key="`${activity.actor}-${activity.time}`" class="flex min-w-0 items-start gap-3.5 rounded-[24px] bg-white/60 p-4">
        <div class="activity-avatar grid h-[42px] w-[42px] shrink-0 place-items-center rounded-2xl font-black text-white">
          {{ activity.actor.slice(0, 1) }}
        </div>
        <div>
          <p class="m-0 mb-1 text-[var(--clay-foreground)]">
            <strong>{{ activity.actor }}</strong>
            {{ activity.action }}
          </p>
          <span class="text-[var(--clay-muted)]">{{ activity.time }}</span>
        </div>
      </li>
    </ol>
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

.activity-avatar {
  background: linear-gradient(145deg, #f472b6, #7c3aed);
}

.empty-state {
  box-shadow: inset 6px 6px 14px rgba(217, 212, 227, 0.78), inset -6px -6px 14px #ffffff;
}
</style>
