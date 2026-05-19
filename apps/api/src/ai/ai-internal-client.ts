import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fail } from '../common/api-response';
import type { InternalAiTextResult, TextParseContext } from './ai.types';

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
  constructor(private readonly configService: ConfigService) {}

  async parseTextTransaction(request: ParseTextTransactionRequest): Promise<InternalAiTextResult> {
    const baseUrl = this.configService.get<string>('AI_SERVICE_BASE_URL') ?? 'http://127.0.0.1:8000';
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/internal/ai/text-transaction`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
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
  return 'candidate' in value && 'rawResult' in value;
}
