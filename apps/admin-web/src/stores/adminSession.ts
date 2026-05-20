import { defineStore } from 'pinia'

export const useAdminSessionStore = defineStore('adminSession', {
  state: () => ({
    accessToken: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
  },
  actions: {
    setAccessToken(accessToken: string) {
      this.accessToken = accessToken
    },
    clearSession() {
      this.accessToken = null
    },
    clearAccessToken() {
      this.clearSession()
    },
  },
  persist: {
    key: 'bookkeeping_admin_session',
    pick: ['accessToken'],
  },
})
