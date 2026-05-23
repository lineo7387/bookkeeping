import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fail } from '../common/api-response';
import type { InternalAiTextResult, TextParseContext } from './ai.types';

export const AI_FETCH_IMPL = Symbol('AI_FETCH_IMPL');

export interface ParseTextTransactionRequest {
  taskId: string;
  ledgerId: string;
  userId: string;
  inputText: string;
  locale: string;
  timezone: string;
  defaultCurrency: string;
  context: TextParseContext;
}

@Injectable()
export class AiInternalClient {
  constructor(
    private readonly configService: ConfigService,
    @Inject(AI_FETCH_IMPL) private readonly fetchImpl: typeof fetch,
  ) {}

  async parseTextTransaction(request: ParseTextTransactionRequest): Promise<InternalAiTextResult> {
    const baseUrl = this.configService.get<string>('AI_SERVICE_BASE_URL') ?? 'http://127.0.0.1:8000';
    const timeoutMs = getTimeoutMs(this.configService.get<string>('AI_SERVICE_TIMEOUT_MS'));
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${baseUrl.replace(/\/+$/, '')}/internal/ai/text-transaction`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          taskId: request.taskId,
          ledgerId: request.ledgerId,
          userId: request.userId,
          inputText: request.inputText,
          locale: request.locale,
          timezone: request.timezone,
          defaultCurrency: request.defaultCurrency,
          context: {
            categoryNames: request.context.categoryNames,
            accountHints: request.context.accountHints,
          },
        }),
      });
    } catch {
      throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI service request failed'));
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI service request failed'));
    }

    const body = (await response.json()) as unknown;
    if (!isInternalAiTextResult(body)) {
      throw new ServiceUnavailableException(fail('AI_TASK_FAILED', 'AI service response is invalid'));
    }

    return body;
  }
}

function isInternalAiTextResult(value: unknown): value is InternalAiTextResult {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (!('status' in value) || (value.status !== 'succeeded' && value.status !== 'failed')) {
    return false;
  }
  if (!('candidate' in value) || !('rawResult' in value)) {
    return false;
  }
  if (value.status === 'failed') {
    return value.candidate === null && isNullableRecord(value.rawResult);
  }
  return isInternalAiTextCandidate(value.candidate) && isNullableRecord(value.rawResult);
}

function isInternalAiTextCandidate(value: unknown): value is InternalAiTextResult['candidate'] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.type === 'income' || candidate.type === 'expense') &&
    isPositiveDecimalString(candidate.amount) &&
    typeof candidate.currency === 'string' &&
    /^[A-Z]{3}$/.test(candidate.currency) &&
    typeof candidate.occurredAt === 'string' &&
    Number.isFinite(Date.parse(candidate.occurredAt)) &&
    isNullableString(candidate.categoryName) &&
    isNullableString(candidate.accountHint) &&
    isNullableString(candidate.merchant) &&
    isNullableString(candidate.note) &&
    typeof candidate.confidence === 'number' &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1 &&
    isOptionalMissingFields(candidate.missingFields) &&
    isOptionalNullableString(candidate.reviewMessage)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || isNullableString(value);
}

function isOptionalMissingFields(value: unknown): value is Array<'accountId' | 'categoryId'> | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((field) => field === 'accountId' || field === 'categoryId'))
  );
}

function isNullableRecord(value: unknown): value is Record<string, unknown> | null {
  return value === null || (typeof value === 'object' && !Array.isArray(value));
}

function isPositiveDecimalString(value: unknown): value is string {
  return typeof value === 'string' && /^(?=.*[1-9])\d{1,16}(\.\d{1,2})?$/.test(value);
}

function getTimeoutMs(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return 5000;
}
