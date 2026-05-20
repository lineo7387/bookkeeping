import type {
  AiCandidateTransaction,
  AiExtractionSummary,
  AiTaskDetail,
  AiTextParseResult,
  AiTaskStatus,
  AiTaskType,
  AdminAiTaskSummary,
  AdminAuditLogSummary,
  AdminLedgerSummary,
  AdminUserSummary,
  ApiError,
  ApiResponse,
  PaginatedItems,
  ConfirmAiExtractionResult,
} from '@bookkeeping/shared-types';

export interface BookkeepingApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
  headers?: HeadersInit;
}

export interface AiTextParseRequest {
  inputText: string;
  locale?: string;
  timezone?: string;
  defaultCurrency?: string;
}

export interface ConfirmAiExtractionRequest {
  ledgerId: string;
  accountId?: string;
  categoryId?: string;
  amount?: string;
  occurredAt?: string;
  visibility?: 'ledger' | 'private';
  note?: string | null;
}

export interface RejectAiExtractionRequest {
  reason?: string;
}

export type RejectAiExtractionResult = AiExtractionSummary;

export interface AdminListQuery {
  limit?: number;
  offset?: number;
}

export interface AdminAiTasksQuery extends AdminListQuery {
  status?: AiTaskStatus;
  type?: AiTaskType;
}

export class BookkeepingApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getAccessToken?: BookkeepingApiClientOptions['getAccessToken'];
  private readonly defaultHeaders?: HeadersInit;

  constructor(options: BookkeepingApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.getAccessToken = options.getAccessToken;
    this.defaultHeaders = options.headers;

    if (!this.fetchImpl) {
      throw new Error('A fetch implementation is required.');
    }
  }

  parseAiText(
    ledgerId: string,
    body: AiTextParseRequest,
  ): Promise<ApiResponse<AiTextParseResult>> {
    return this.request<AiTextParseResult>(`/ledgers/${encodeURIComponent(ledgerId)}/ai/text-parse`, {
      method: 'POST',
      body,
    });
  }

  getAiTask(taskId: string): Promise<ApiResponse<AiTaskDetail>> {
    return this.request<AiTaskDetail>(`/ai/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
    });
  }

  listLedgerAiTasks(
    ledgerId: string,
    query: AdminListQuery = {},
  ): Promise<ApiResponse<PaginatedItems<AiTaskDetail>>> {
    return this.request<PaginatedItems<AiTaskDetail>>(
      `/ledgers/${encodeURIComponent(ledgerId)}/ai/tasks${toQueryString(query)}`,
      {
        method: 'GET',
      },
    );
  }

  confirmAiExtraction(
    extractionId: string,
    body: ConfirmAiExtractionRequest,
  ): Promise<ApiResponse<ConfirmAiExtractionResult>> {
    return this.request<ConfirmAiExtractionResult>(
      `/ai/extractions/${encodeURIComponent(extractionId)}/confirm`,
      {
        method: 'POST',
        body,
      },
    );
  }

  rejectAiExtraction(
    extractionId: string,
    body: RejectAiExtractionRequest = {},
  ): Promise<ApiResponse<RejectAiExtractionResult>> {
    return this.request<RejectAiExtractionResult>(
      `/ai/extractions/${encodeURIComponent(extractionId)}/reject`,
      {
        method: 'POST',
        body,
      },
    );
  }

  listAdminUsers(
    query: AdminListQuery = {},
  ): Promise<ApiResponse<PaginatedItems<AdminUserSummary>>> {
    return this.request<PaginatedItems<AdminUserSummary>>(`/admin/users${toQueryString(query)}`, {
      method: 'GET',
    });
  }

  listAdminLedgers(
    query: AdminListQuery = {},
  ): Promise<ApiResponse<PaginatedItems<AdminLedgerSummary>>> {
    return this.request<PaginatedItems<AdminLedgerSummary>>(
      `/admin/ledgers${toQueryString(query)}`,
      {
        method: 'GET',
      },
    );
  }

  listAdminAiTasks(
    query: AdminAiTasksQuery = {},
  ): Promise<ApiResponse<PaginatedItems<AdminAiTaskSummary>>> {
    return this.request<PaginatedItems<AdminAiTaskSummary>>(
      `/admin/ai/tasks${toQueryString(query)}`,
      {
        method: 'GET',
      },
    );
  }

  listAdminAuditLogs(
    query: AdminListQuery = {},
  ): Promise<ApiResponse<PaginatedItems<AdminAuditLogSummary>>> {
    return this.request<PaginatedItems<AdminAuditLogSummary>>(
      `/admin/audit-logs${toQueryString(query)}`,
      {
        method: 'GET',
      },
    );
  }

  async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: unknown;
      headers?: HeadersInit;
    } = {},
  ): Promise<ApiResponse<T>> {
    const headers = new Headers(this.defaultHeaders);
    headers.set('Accept', 'application/json');

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    const accessToken = await this.getAccessToken?.();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    for (const [key, value] of new Headers(options.headers)) {
      headers.set(key, value);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Network request failed',
          details: toErrorDetails(error),
        },
      };
    }

    const parsed = await parseJsonResponse<T>(response);

    if (parsed.kind === 'response') {
      return parsed.response;
    }

    if (parsed.kind === 'invalid') {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: parsed.message,
          details: parsed.details,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Empty API response body',
        details: {
          status: response.status,
        },
      },
    };
  }
}

export function createApiClient(options: BookkeepingApiClientOptions): BookkeepingApiClient {
  return new BookkeepingApiClient(options);
}

type JsonResponseParseResult<T> =
  | {
      kind: 'empty';
    }
  | {
      kind: 'response';
      response: ApiResponse<T>;
    }
  | {
      kind: 'invalid';
      message: string;
      details?: unknown;
    };

async function parseJsonResponse<T>(response: Response): Promise<JsonResponseParseResult<T>> {
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    return {
      kind: 'invalid',
      message: 'Failed to read API response body',
      details: toErrorDetails(error),
    };
  }

  if (!text) {
    return {
      kind: 'empty',
    };
  }

  try {
    const value = JSON.parse(text) as unknown;
    if (isApiResponse<T>(value)) {
      return {
        kind: 'response',
        response: value,
      };
    }
  } catch {
    return {
      kind: 'invalid',
      message: 'Invalid JSON response',
    };
  }

  return {
    kind: 'invalid',
    message: 'Unexpected API response shape',
  };
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (!('success' in value) || typeof value.success !== 'boolean') {
    return false;
  }

  if (value.success) {
    return 'data' in value && !('error' in value);
  }

  return 'error' in value && isApiError(value.error);
}

function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

function toErrorDetails(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return error;
}

function toQueryString(query: AdminListQuery & Pick<AdminAiTasksQuery, 'status' | 'type'>): string {
  const params = new URLSearchParams();

  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }

  if (query.offset !== undefined) {
    params.set('offset', String(query.offset));
  }

  if (query.status !== undefined) {
    params.set('status', String(query.status));
  }

  if (query.type !== undefined) {
    params.set('type', String(query.type));
  }

  const value = params.toString();
  return value ? `?${value}` : '';
}

export type {
  AiCandidateTransaction,
  AiExtractionSummary,
  AiTaskDetail,
  AiTextParseResult,
  ApiError,
  ApiResponse,
  ConfirmAiExtractionResult,
};
