<script setup lang="ts">
import {
  Bell,
  Bot,
  ChartPie,
  CircleDollarSign,
  ClipboardCheck,
  DatabaseZap,
  FileText,
  Home,
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
  <div class="grid min-h-screen gap-6 p-6 max-[860px]:p-4 min-[1121px]:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="sidebar rounded-[44px] border border-white/70 p-6 min-[1121px]:sticky min-[1121px]:top-6 min-[1121px]:h-[calc(100vh-48px)]" aria-label="后台导航">
      <div class="flex min-w-0 items-center gap-3.5">
        <div class="brand-mark grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[20px] font-['Nunito'] text-[26px] font-black text-white">B</div>
        <div>
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">Bookkeeping</p>
          <h1 class="m-0 font-['Nunito'] text-xl font-black text-[var(--clay-foreground)] max-[560px]:text-lg">智能记账后台</h1>
        </div>
      </div>

      <nav class="mt-8 grid gap-3 max-[1120px]:grid-cols-5 max-[860px]:grid-cols-2">
        <button
          v-for="item in navItems"
          :key="item.label"
          class="nav-item flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-[20px] border-0 bg-transparent px-4 text-[var(--clay-muted)] transition duration-200 max-[1120px]:justify-center"
          :class="{ 'nav-item-active': item.active }"
          type="button"
        >
          <component :is="item.icon" :size="20" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="grid min-w-0 content-start gap-6">
      <header class="flex min-h-[76px] items-center justify-between gap-4 max-[860px]:flex-col max-[860px]:items-start">
        <div>
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">M0 工程底座</p>
          <h2 class="m-0 font-['Nunito'] text-[34px] font-black text-[var(--clay-foreground)] max-[560px]:text-[28px]">运营总览</h2>
        </div>
        <div class="flex flex-wrap justify-end gap-4 max-[860px]:w-full max-[860px]:justify-stretch">
          <ClayButton variant="secondary" aria-label="查看通知">
            <Bell :size="20" aria-hidden="true" />
          </ClayButton>
          <ClayButton>
            <ClipboardCheck :size="20" aria-hidden="true" />
            <span>处理任务</span>
          </ClayButton>
        </div>
      </header>

      <section class="hero-panel grid min-h-[260px] grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] gap-6 overflow-hidden rounded-[44px] border border-white/70 p-8 max-[860px]:grid-cols-1 max-[560px]:rounded-[28px] max-[560px]:p-5" aria-labelledby="hero-title">
        <div class="grid max-w-[760px] content-center gap-3.5">
          <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">家庭共享账本 · AI 候选确认 · 私密流水</p>
          <h2 id="hero-title" class="m-0 max-w-[720px] font-['Nunito'] text-[44px] leading-[1.12] font-black text-[var(--clay-foreground)] max-[860px]:text-[34px] max-[560px]:text-[28px]">
            把账本、成员、AI 任务放在一个清晰的工作台里。
          </h2>
          <p class="m-0 max-w-[660px] text-[17px] font-medium text-[var(--clay-muted)]">
            后台第一屏服务于排查和运营：看系统健康、看 AI 队列、看账本协作风险，后续模块会按中文文档逐步接入真实接口。
          </p>
        </div>
        <div class="hero-object relative min-h-[220px] max-[560px]:min-h-[168px]" aria-hidden="true">
          <div class="orb orb-violet">
            <FileText :size="38" />
          </div>
          <div class="orb orb-blue">
            <Bot :size="34" />
          </div>
          <div class="orb orb-green">
            <ShieldCheck :size="32" />
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
.hero-panel {
  background: var(--clay-surface);
  box-shadow: var(--clay-shadow-card);
  backdrop-filter: blur(20px);
}

.brand-mark {
  background: linear-gradient(145deg, var(--clay-violet-soft), var(--clay-violet));
  box-shadow: var(--clay-shadow-button);
}

.nav-item:hover,
.nav-item-active {
  color: var(--clay-foreground);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: var(--clay-shadow-pressed);
}

.nav-item:active {
  transform: scale(0.96);
}

.nav-item:focus-visible {
  outline: 4px solid rgba(124, 58, 237, 0.24);
  outline-offset: 3px;
}

.orb {
  position: absolute;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #ffffff;
  box-shadow: var(--clay-shadow-button);
  animation: clay-breathe 6s ease-in-out infinite;
}

.orb-violet {
  top: 20px;
  right: 54px;
  width: 118px;
  height: 118px;
  background: linear-gradient(145deg, #a78bfa, #7c3aed);
}

.orb-blue {
  top: 108px;
  right: 150px;
  width: 92px;
  height: 92px;
  background: linear-gradient(145deg, #38bdf8, #0ea5e9);
  animation-delay: 1s;
}

.orb-green {
  right: 34px;
  bottom: 12px;
  width: 82px;
  height: 82px;
  background: linear-gradient(145deg, #34d399, #10b981);
  animation-delay: 2s;
}

@media (max-width: 560px) {
  .orb-violet {
    right: 34px;
    width: 96px;
    height: 96px;
  }

  .orb-blue {
    right: 120px;
    width: 76px;
    height: 76px;
  }

  .orb-green {
    width: 70px;
    height: 70px;
  }
}
</style>
