<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string
  hint: string
  tone: 'violet' | 'blue' | 'pink' | 'green'
  icon: Component
}>()
</script>

<template>
  <article class="stat-card grid min-h-[154px] gap-2 rounded-[26px] border border-white/70 p-5 transition duration-200">
    <div class="grid h-11 w-11 place-items-center rounded-2xl text-white" :class="`tone-${tone}`">
      <component :is="icon" :size="24" aria-hidden="true" />
    </div>
    <p class="m-0 font-bold text-[var(--clay-muted)]">{{ label }}</p>
    <strong class="m-0 font-['Nunito'] text-[32px] font-black text-[var(--clay-foreground)]">{{ value }}</strong>
    <span class="m-0 text-[var(--clay-muted)]">{{ hint }}</span>
  </article>
</template>

<style scoped>
.stat-card {
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    10px 14px 28px rgba(160, 150, 180, 0.14),
    -8px -8px 20px rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
}

.stat-card:hover {
  transform: translateY(-3px);
}

.tone-violet {
  background: linear-gradient(145deg, #a78bfa, #7c3aed);
}

.tone-blue {
  background: linear-gradient(145deg, #38bdf8, #0ea5e9);
}

.tone-pink {
  background: linear-gradient(145deg, #f472b6, #db2777);
}

.tone-green {
  background: linear-gradient(145deg, #34d399, #10b981);
}
</style>
