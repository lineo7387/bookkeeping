<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ClayBackground from './components/layout/ClayBackground.vue'
import DashboardView from './views/DashboardView.vue'
import AdminLoginView from './views/AdminLoginView.vue'
import AiTasksView from './views/AiTasksView.vue'
import type { AdminShellView } from './types/adminNavigation'
import { useAdminSessionStore } from './stores/adminSession'

const session = useAdminSessionStore()
const isAuthenticated = computed(() => session.isAuthenticated)
const activeView = shallowRef<AdminShellView>('dashboard')
</script>

<template>
  <ClayBackground />
  <template v-if="isAuthenticated">
    <DashboardView
      v-if="activeView === 'dashboard'"
      @logout="session.clearSession"
      @navigate="activeView = $event"
    />
    <AiTasksView
      v-else-if="activeView === 'aiTasks'"
      @logout="session.clearSession"
      @navigate="activeView = $event"
    />
  </template>
  <AdminLoginView v-else />
</template>
