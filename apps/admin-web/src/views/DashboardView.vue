<script setup lang="ts">
import {
  Bell,
  Bot,
  ChartPie,
  CircleDollarSign,
  ClipboardCheck,
  DatabaseZap,
  Home,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-vue-next'
import ActivityPanel from '../components/dashboard/ActivityPanel.vue'
import StatCard from '../components/dashboard/StatCard.vue'
import TaskPanel from '../components/dashboard/TaskPanel.vue'
import ClayButton from '../components/ui/ClayButton.vue'

const navItems = [
  { label: '总览', icon: Home, active: true },
  { label: '用户', icon: Users, active: false },
  { label: '账本', icon: CircleDollarSign, active: false },
  { label: 'AI任务', icon: Bot, active: false },
  { label: '审计', icon: ShieldCheck, active: false },
]

const stats = [
  {
    label: '本月流水',
    value: '12,486',
    hint: '较上月 +18%',
    tone: 'violet' as const,
    icon: ChartPie,
  },
  {
    label: '活跃账本',
    value: '326',
    hint: '家庭账本 214',
    tone: 'blue' as const,
    icon: Users,
  },
  {
    label: 'AI候选',
    value: '89',
    hint: '待确认 17',
    tone: 'pink' as const,
    icon: Bot,
  },
  {
    label: '系统健康',
    value: '99.9%',
    hint: 'Redis/PostgreSQL 正常',
    tone: 'green' as const,
    icon: DatabaseZap,
  },
]

const tasks = [
  {
    title: '票据 OCR 队列',
    detail: '3 个任务等待重试，建议检查图片解析日志。',
    status: 'warning' as const,
  },
  {
    title: '家庭账本邀请',
    detail: '12 个邀请将在 24 小时内过期。',
    status: 'info' as const,
  },
  {
    title: '权限策略文档',
    detail: 'ledger_members Policy 需要在 M1 前细化。',
    status: 'success' as const,
  },
]

const activities = [
  { actor: '系统', action: '生成 AI 候选流水', time: '2 分钟前' },
  { actor: '管理员', action: '查看家庭账本审计日志', time: '18 分钟前' },
  { actor: '用户服务', action: '刷新成员权限缓存', time: '42 分钟前' },
]
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
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">M0 工程底座</p>
          <h2 class="m-0 font-['Nunito'] text-[34px] font-black text-[var(--clay-foreground)] max-[560px]:text-[28px]">运营总览</h2>
        </div>
        <div class="flex flex-wrap justify-end gap-3 max-[860px]:w-full max-[860px]:justify-stretch">
          <label class="search-box flex min-h-11 min-w-[260px] items-center gap-2 rounded-2xl px-4 text-sm text-[var(--clay-muted)] max-[560px]:w-full max-[560px]:min-w-0">
            <Search :size="18" aria-hidden="true" />
            <span>搜索用户、账本或 AI 任务</span>
          </label>
          <ClayButton variant="secondary" aria-label="查看通知">
            <Bell :size="20" aria-hidden="true" />
          </ClayButton>
          <ClayButton>
            <ClipboardCheck :size="20" aria-hidden="true" />
            <span>处理任务</span>
          </ClayButton>
        </div>
      </header>

      <section class="status-panel grid grid-cols-[minmax(0,1fr)_280px] gap-5 rounded-[28px] border border-white/70 p-5 max-[860px]:grid-cols-1" aria-labelledby="hero-title">
        <div class="grid content-center gap-3">
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">家庭共享账本 · AI 候选确认 · 私密流水</p>
          <h2 id="hero-title" class="m-0 max-w-[720px] font-['Nunito'] text-[30px] leading-tight font-black text-[var(--clay-foreground)] max-[560px]:text-2xl">
            今日需要关注 3 类运营事项
          </h2>
          <p class="m-0 max-w-[720px] text-base font-medium text-[var(--clay-muted)]">
            AI 队列、账本邀请和权限文档是当前 M0 阶段的主要关注点。后续模块会按中文文档逐步接入真实接口。
          </p>
        </div>
        <div class="status-stack grid gap-3">
          <div class="status-row">
            <span class="status-dot status-dot-green" />
            <span>API build/typecheck 通过</span>
          </div>
          <div class="status-row">
            <span class="status-dot status-dot-blue" />
            <span>PostgreSQL / Redis 已预留配置</span>
          </div>
          <div class="status-row">
            <span class="status-dot status-dot-violet" />
            <span>AI 候选确认流程已规范</span>
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
        <TaskPanel :tasks="tasks" />
        <ActivityPanel :activities="activities" />
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
