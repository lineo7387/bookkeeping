import { createPinia } from 'pinia'
import { loginAdmin } from './adminAuth'
import { useAdminSessionStore } from '../stores/adminSession'

const pinia = createPinia()
const session = useAdminSessionStore(pinia)

async function assertAdminLoginFlow() {
  const result = await loginAdmin({
    email: 'admin@example.com',
    password: 'password123',
  })

  session.setAccessToken(result.accessToken)
  session.clearSession()

  return {
    accessToken: result.accessToken,
    isAuthenticated: session.isAuthenticated,
  }
}

export const adminAuthFlowTypeCheck = assertAdminLoginFlow
