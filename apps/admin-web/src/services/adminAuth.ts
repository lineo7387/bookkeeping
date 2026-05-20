import type { AuthResult, ApiResponse } from '@bookkeeping/shared-types'
import { adminApiClient } from './apiClient'

export interface AdminLoginCredentials {
  email: string
  password: string
}

export async function loginAdmin(credentials: AdminLoginCredentials): Promise<AuthResult> {
  return unwrapAuthResponse(await adminApiClient.login(credentials))
}

function unwrapAuthResponse(response: ApiResponse<AuthResult>): AuthResult {
  if (response.success) {
    return response.data
  }

  throw new Error(response.error.message)
}
