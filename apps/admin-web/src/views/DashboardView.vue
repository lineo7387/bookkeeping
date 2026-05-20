<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Bell,
  Bot,
  CircleDollarSign,
  DatabaseZap,
  Home,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'
import { useAdminDashboard } from '../composables/useAdminDashboard'
import ActivityPanel from '../components/dashboard/ActivityPanel.vue'
import StatCard from '../components/dashboard/StatCard.vue'
import TaskPanel from '../components/dashboard/TaskPanel.vue'
import ClayButton from '../components/ui/ClayButton.vue'
import type { DashboardStatItem } from '../services/adminDashboard'

defineEmits<{
  logout: []
}>()

const navItems = [
  { label: '总览', icon: Home, active: true },
  { label: '用户', icon: Users, active: false },
  { label: '账本', icon: CircleDollarSign, active: false },
  { label: 'AI任务', icon: Bot, active: false },
  { label: '审计', icon: ShieldCheck, active: false },
]

const statIcons = {
  users: Users,
  ledgers: CircleDollarSign,
  aiTasks: Bot,
  auditLogs: DatabaseZap,
} satisfies Record<DashboardStatItem['key'], typeof Users>

const { viewModel, isLoading, errorMessage, lastLoadedAt, refresh } = useAdminDashboard()

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
          :class="{ 'nav-item-active': item.active }"
          type="button"
        >
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="grid min-w-0 content-start gap-5">
      <header class="topbar flex min-h-[76px] items-center justify-between gap-4 rounded-[28px] border border-white/70 px-5 py-4 max-[860px]:flex-col max-[860px]:items-start">
        <div>
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">M3 后台只读 API</p>
          <h2 class="m-0 font-['Nunito'] text-[34px] font-black text-[var(--clay-foreground)] max-[560px]:text-[28px]">运营总览</h2>
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
          <ClayButton :disabled="isLoading" @click="refresh">
            <RefreshCw :size="20" aria-hidden="true" :class="{ 'animate-spin': isLoading }" />
            <span>{{ isLoading ? '加载中' : '刷新数据' }}</span>
          </ClayButton>
        </div>
      </header>

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
        <TaskPanel :tasks="viewModel.tasks" />
        <ActivityPanel :activities="viewModel.activities" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.sidebar,
.topbar,
.status-panel {
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

.nav-item:hover {
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

.nav-item:active {
  transform: scale(0.96);
}

.nav-item:focus-visible {
  outline: 4px solid rgba(124, 58, 237, 0.24);
  outline-offset: 3px;
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
