import {
  createApiClient,
  type BookkeepingApiClient,
  type BookkeepingApiClientOptions,
} from '@bookkeeping/api-client'
import { useAdminSessionStore } from '../stores/adminSession'

type AdminApiClientOptions = Pick<BookkeepingApiClientOptions, 'fetch' | 'getAccessToken' | 'headers'>

export function createAdminApiClient(options: AdminApiClientOptions = {}): BookkeepingApiClient {
  return createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    getAccessToken: options.getAccessToken ?? (() => useAdminSessionStore().accessToken),
    headers: options.headers,
  })
}

export const adminApiClient = createAdminApiClient()
