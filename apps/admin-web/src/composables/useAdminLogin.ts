import { computed, reactive, readonly, shallowRef } from 'vue'
import { loginAdmin } from '../services/adminAuth'
import { useAdminSessionStore } from '../stores/adminSession'

export function useAdminLogin() {
  const form = reactive({
    email: '',
    password: '',
  })
  const isSubmitting = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  const session = useAdminSessionStore()

  const canSubmit = computed(() => {
    return form.email.trim().length > 0 && form.password.length >= 8 && !isSubmitting.value
  })

  async function submitLogin() {
    if (!canSubmit.value) {
      return
    }

    isSubmitting.value = true
    errorMessage.value = null

    try {
      const result = await loginAdmin({
        email: form.email.trim(),
        password: form.password,
      })
      session.setAccessToken(result.accessToken)
      form.password = ''
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '登录失败'
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    form,
    canSubmit,
    isSubmitting: readonly(isSubmitting),
    errorMessage: readonly(errorMessage),
    submitLogin,
  }
}
