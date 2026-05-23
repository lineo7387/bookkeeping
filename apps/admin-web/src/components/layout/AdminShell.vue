<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Bell, Bot, CircleDollarSign, Home, LogOut, RefreshCw, Search, ShieldCheck, Users } from 'lucide-vue-next'
import ClayButton from '../ui/ClayButton.vue'
import type { AdminShellView } from '../../types/adminNavigation'

const props = defineProps<{
  activeView: AdminShellView
  eyebrow: string
  title: string
  lastLoadedLabel: string
  isLoading: boolean
}>()

defineEmits<{
  logout: []
  refresh: []
  navigate: [view: AdminShellView]
}>()

interface NavItem {
  label: string
  view: AdminShellView | null
  icon: Component
}

const navItems = computed<NavItem[]>(() => [
  { label: '总览', view: 'dashboard', icon: Home },
  { label: '用户', view: null, icon: Users },
  { label: '账本', view: null, icon: CircleDollarSign },
  { label: 'AI任务', view: 'aiTasks', icon: Bot },
  { label: '审计', view: null, icon: ShieldCheck },
])

function isActive(item: NavItem): boolean {
  return item.view === props.activeView
}
</script>

<template>
  <div class="grid min-h-screen gap-6 p-6 max-[860px]:p-4 min-[1121px]:grid-cols-[248px_minmax(0,1fr)]">
    <aside class="sidebar rounded-[28px] border border-white/80 p-4 min-[1121px]:sticky min-[1121px]:top-6 min-[1121px]:h-[calc(100vh-48px)]" aria-label="后台导航">
      <div class="flex min-w-0 items-center gap-3.5">
        <div class="brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-['Nunito'] text-xl font-black text-white">B</div>
        <div>
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">Bookkeeping</p>
          <h1 class="m-0 font-['Nunito'] text-lg font-black text-[var(--clay-foreground)]">智能记账后台</h1>
        </div>
      </div>

      <nav class="mt-7 grid gap-1.5 max-[1120px]:grid-cols-5 max-[860px]:grid-cols-2">
        <button
          v-for="item in navItems"
          :key="item.label"
          class="nav-item relative flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[16px] border-0 bg-transparent px-3 text-sm font-bold text-[var(--clay-muted)] transition duration-200 max-[1120px]:justify-center"
          :class="{ 'nav-item-active': isActive(item) }"
          type="button"
          :aria-current="isActive(item) ? 'page' : undefined"
          :disabled="item.view === null"
          @click="item.view && $emit('navigate', item.view)"
        >
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="grid min-w-0 content-start gap-5">
      <header class="topbar flex min-h-[76px] items-center justify-between gap-4 rounded-[28px] border border-white/70 px-5 py-4 max-[860px]:flex-col max-[860px]:items-start">
        <div>
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">{{ eyebrow }}</p>
          <h2 class="m-0 font-['Nunito'] text-[34px] font-black text-[var(--clay-foreground)] max-[560px]:text-[28px]">{{ title }}</h2>
        </div>
        <div class="flex flex-wrap justify-end gap-3 max-[860px]:w-full max-[860px]:justify-stretch">
          <label class="search-box flex min-h-11 min-w-[260px] items-center gap-2 rounded-2xl px-4 text-sm text-[var(--clay-muted)] max-[560px]:w-full max-[560px]:min-w-0">
            <Search :size="18" aria-hidden="true" />
            <span>Admin API · 最近加载 {{ lastLoadedLabel }}</span>
          </label>
          <ClayButton variant="secondary" aria-label="查看通知">
            <Bell :size="20" aria-hidden="true" />
          </ClayButton>
          <ClayButton variant="secondary" @click="$emit('logout')">
            <LogOut :size="20" aria-hidden="true" />
            <span>退出</span>
          </ClayButton>
          <ClayButton :disabled="isLoading" @click="$emit('refresh')">
            <RefreshCw :size="20" aria-hidden="true" :class="{ 'animate-spin': isLoading }" />
            <span>{{ isLoading ? '加载中' : '刷新数据' }}</span>
          </ClayButton>
        </div>
      </header>

      <slot />
    </main>
  </div>
</template>

<style scoped>
.sidebar,
.topbar {
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    10px 14px 30px rgba(160, 150, 180, 0.14),
    -8px -8px 20px rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
}

.brand-mark {
  background: linear-gradient(145deg, var(--clay-violet-soft), var(--clay-violet));
  box-shadow:
    8px 10px 18px rgba(124, 58, 237, 0.22),
    inset 3px 3px 6px rgba(255, 255, 255, 0.38);
}

.search-box {
  background: rgba(244, 241, 250, 0.76);
  box-shadow: var(--clay-shadow-pressed);
}

.nav-item:hover:not(:disabled) {
  color: var(--clay-foreground);
  background: rgba(255, 255, 255, 0.54);
}

.nav-item-active {
  color: var(--clay-foreground);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 6px 8px 18px rgba(160, 150, 180, 0.12);
}

.nav-item-active::before {
  position: absolute;
  left: 8px;
  width: 4px;
  height: 20px;
  border-radius: 999px;
  background: var(--clay-violet);
  content: '';
}

.nav-item:disabled {
  cursor: default;
  opacity: 0.48;
}

.nav-item:active:not(:disabled) {
  transform: scale(0.96);
}

.nav-item:focus-visible {
  outline: 4px solid rgba(124, 58, 237, 0.24);
  outline-offset: 3px;
}
</style>
