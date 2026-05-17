import type { ApiErrorCode, ApiResponse } from '@bookkeeping/shared-types';

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(code: ApiErrorCode, message: string, details?: unknown): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}
