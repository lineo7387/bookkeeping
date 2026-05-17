<script setup lang="ts">
type ClayButtonVariant = 'primary' | 'secondary'

withDefaults(
  defineProps<{
    variant?: ClayButtonVariant
  }>(),
  {
    variant: 'primary',
  },
)
</script>

<template>
  <button
    class="clay-button inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-[20px] border-0 px-5 font-extrabold transition duration-200 focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-violet-300"
    :class="`clay-button-${variant}`"
    type="button"
  >
    <slot />
  </button>
</template>

<style scoped>
.clay-button-primary {
  color: #ffffff;
  background: linear-gradient(145deg, var(--clay-violet-soft), var(--clay-violet));
  box-shadow: var(--clay-shadow-button);
}

.clay-button-secondary {
  color: var(--clay-foreground);
  background: var(--clay-surface-strong);
  box-shadow: var(--clay-shadow-card);
}

.clay-button:hover {
  transform: translateY(-3px);
}

.clay-button:active {
  box-shadow: var(--clay-shadow-pressed);
  transform: scale(0.94);
}
</style>
