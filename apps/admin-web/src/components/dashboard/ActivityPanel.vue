<script setup lang="ts">
defineProps<{
  activities: Array<{
    actor: string
    action: string
    time: string
  }>
}>()
</script>

<template>
  <section class="panel rounded-[32px] border border-white/70 p-6" aria-labelledby="activity-panel-title">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">审计</p>
        <h2 id="activity-panel-title" class="m-0 font-['Nunito'] text-2xl font-black text-[var(--clay-foreground)]">最近活动</h2>
      </div>
    </div>

    <ol class="mt-5 grid list-none gap-3.5 p-0">
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
  background: var(--clay-surface);
  box-shadow: var(--clay-shadow-card);
  backdrop-filter: blur(20px);
}

.activity-avatar {
  background: linear-gradient(145deg, #f472b6, #7c3aed);
}
</style>
