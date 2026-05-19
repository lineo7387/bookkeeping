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
    clearAccessToken() {
      this.accessToken = null
    },
  },
  persist: {
    key: 'bookkeeping_admin_session',
    pick: ['accessToken'],
  },
})
