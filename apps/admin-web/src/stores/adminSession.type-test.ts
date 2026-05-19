import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createAdminApiClient } from '../services/apiClient'
import { useAdminSessionStore } from './adminSession'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const session = useAdminSessionStore(pinia)

session.setAccessToken('access-token')
session.clearAccessToken()

export const adminWebStateFoundationTypeCheck = {
  client: createAdminApiClient({
    getAccessToken: () => session.accessToken,
  }),
  isAuthenticated: session.isAuthenticated,
}
