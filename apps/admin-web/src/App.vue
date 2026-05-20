<script setup lang="ts">
import { computed } from 'vue'
import ClayBackground from './components/layout/ClayBackground.vue'
import DashboardView from './views/DashboardView.vue'
import AdminLoginView from './views/AdminLoginView.vue'
import { useAdminSessionStore } from './stores/adminSession'

const session = useAdminSessionStore()
const isAuthenticated = computed(() => session.isAuthenticated)
</script>

<template>
  <ClayBackground />
  <DashboardView v-if="isAuthenticated" @logout="session.clearSession" />
  <AdminLoginView v-else />
</template>
