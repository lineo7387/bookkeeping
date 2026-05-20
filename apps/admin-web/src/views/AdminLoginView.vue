<script setup lang="ts">
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-vue-next'
import ClayButton from '../components/ui/ClayButton.vue'
import { useAdminLogin } from '../composables/useAdminLogin'

const { form, canSubmit, isSubmitting, errorMessage, submitLogin } = useAdminLogin()
</script>

<template>
  <main class="login-page grid min-h-screen place-items-center px-5 py-8">
    <section class="login-shell grid w-full max-w-[1040px] grid-cols-[minmax(0,0.95fr)_minmax(360px,0.72fr)] gap-6 rounded-[36px] border border-white/75 p-6 max-[860px]:grid-cols-1 max-[560px]:rounded-[28px] max-[560px]:p-4">
      <div class="login-copy grid content-between gap-8 rounded-[30px] p-7 max-[560px]:rounded-[24px] max-[560px]:p-5">
        <div class="grid gap-4">
          <div class="brand-mark grid h-14 w-14 place-items-center rounded-[20px] font-['Nunito'] text-2xl font-black text-white">B</div>
          <div>
            <p class="m-0 text-xs font-bold text-[var(--clay-muted)]">Bookkeeping Admin</p>
            <h1 class="m-0 max-w-[560px] font-['Nunito'] text-[44px] leading-tight font-black text-[var(--clay-foreground)] max-[560px]:text-[34px]">智能记账后台</h1>
          </div>
        </div>

        <div class="status-stack grid max-w-[520px] gap-3">
          <div class="status-row">
            <span class="status-dot status-dot-violet" />
            <span>NestJS Auth 登录</span>
          </div>
          <div class="status-row">
            <span class="status-dot status-dot-green" />
            <span>JWT 会话持久化</span>
          </div>
          <div class="status-row">
            <span class="status-dot status-dot-blue" />
            <span>Admin Guard 权限校验</span>
          </div>
        </div>
      </div>

      <form class="login-card grid content-start gap-5 rounded-[30px] bg-white/70 p-6 max-[560px]:rounded-[24px] max-[560px]:p-5" @submit.prevent="submitLogin">
        <div class="grid gap-2">
          <div class="icon-badge grid h-12 w-12 place-items-center rounded-2xl text-white">
            <ShieldCheck :size="24" aria-hidden="true" />
          </div>
          <h2 class="m-0 font-['Nunito'] text-[28px] font-black text-[var(--clay-foreground)]">系统管理员登录</h2>
          <p class="m-0 text-sm font-medium text-[var(--clay-muted)]">使用已开启系统管理员权限的账号进入后台。</p>
        </div>

        <label class="field-group grid gap-2">
          <span class="text-sm font-bold text-[var(--clay-foreground)]">邮箱</span>
          <span class="field-control flex min-h-12 items-center gap-3 rounded-[18px] px-4">
            <Mail :size="18" aria-hidden="true" />
            <input
              v-model="form.email"
              class="field-input min-w-0 flex-1 border-0 bg-transparent text-base font-bold text-[var(--clay-foreground)] outline-none"
              autocomplete="email"
              inputmode="email"
              name="email"
              placeholder="admin@example.com"
              type="email"
            >
          </span>
        </label>

        <label class="field-group grid gap-2">
          <span class="text-sm font-bold text-[var(--clay-foreground)]">密码</span>
          <span class="field-control flex min-h-12 items-center gap-3 rounded-[18px] px-4">
            <LockKeyhole :size="18" aria-hidden="true" />
            <input
              v-model="form.password"
              class="field-input min-w-0 flex-1 border-0 bg-transparent text-base font-bold text-[var(--clay-foreground)] outline-none"
              autocomplete="current-password"
              name="password"
              placeholder="至少 8 位"
              type="password"
            >
          </span>
        </label>

        <p v-if="errorMessage" class="error-message m-0 rounded-[18px] px-4 py-3 text-sm font-bold" role="alert">
          {{ errorMessage }}
        </p>

        <ClayButton :disabled="!canSubmit" class="min-h-12 w-full" @click="submitLogin">
          <ShieldCheck :size="20" aria-hidden="true" />
          <span>{{ isSubmitting ? '登录中' : '登录后台' }}</span>
        </ClayButton>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-shell,
.login-card {
  box-shadow: var(--clay-shadow-card);
  backdrop-filter: blur(22px);
}

.login-copy {
  background:
    radial-gradient(circle at 18% 20%, rgba(124, 58, 237, 0.16), transparent 30%),
    radial-gradient(circle at 82% 72%, rgba(14, 165, 233, 0.13), transparent 34%),
    rgba(255, 255, 255, 0.58);
}

.brand-mark,
.icon-badge {
  background: linear-gradient(145deg, var(--clay-violet-soft), var(--clay-violet));
  box-shadow: var(--clay-shadow-button);
}

.field-control,
.status-row {
  color: var(--clay-muted);
  background: rgba(244, 241, 250, 0.76);
  box-shadow: var(--clay-shadow-pressed);
}

.field-input::placeholder {
  color: rgba(99, 95, 105, 0.58);
}

.field-control:focus-within {
  outline: 4px solid rgba(124, 58, 237, 0.2);
  outline-offset: 3px;
}

.status-row {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  border-radius: 18px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 800;
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

.error-message {
  color: #8a123f;
  background: rgba(219, 39, 119, 0.1);
}
</style>
