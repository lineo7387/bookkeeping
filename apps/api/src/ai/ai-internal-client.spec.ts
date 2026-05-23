import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiInternalClient } from './ai-internal-client';

describe('AiInternalClient', () => {
  const request = {
    taskId: 'task_1',
    ledgerId: 'ledger_1',
    userId: 'user_1',
    inputText: '今天晚饭花了86',
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    defaultCurrency: 'CNY',
    context: {
      timezone: 'Asia/Shanghai',
      defaultCurrency: 'CNY',
      categoryNames: ['餐饮'],
      accountHints: ['微信'],
    },
  };

  it('rejects malformed succeeded candidates from the internal AI service', async () => {
    const client = new AiInternalClient(
      { get: jest.fn().mockReturnValue('http://127.0.0.1:8000') } as unknown as ConfigService,
      async () =>
        new Response(
          JSON.stringify({
            status: 'succeeded',
            candidate: {
              type: 'expense',
              amount: '',
              currency: 'CNY',
              occurredAt: 'not-a-date',
              confidence: 2,
            },
            rawResult: {},
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    await expect(client.parseTextTransaction(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('accepts low-confidence review hints from the internal AI service', async () => {
    const client = new AiInternalClient(
      { get: jest.fn().mockReturnValue('http://127.0.0.1:8000') } as unknown as ConfigService,
      async () =>
        new Response(
          JSON.stringify({
            status: 'succeeded',
            candidate: {
              type: 'expense',
              amount: '86.00',
              currency: 'CNY',
              occurredAt: '2026-05-23T10:00:00.000+08:00',
              categoryName: null,
              accountHint: null,
              merchant: null,
              note: '买东西86',
              confidence: 0.78,
              missingFields: ['categoryId', 'accountId'],
              reviewMessage: '请补充分类和账户后再确认',
            },
            rawResult: { provider: 'deterministic-parser' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    await expect(client.parseTextTransaction(request)).resolves.toMatchObject({
      candidate: {
        missingFields: ['categoryId', 'accountId'],
        reviewMessage: '请补充分类和账户后再确认',
      },
    });
  });

  it('rejects invalid review hint fields from the internal AI service', async () => {
    const client = new AiInternalClient(
      { get: jest.fn().mockReturnValue('http://127.0.0.1:8000') } as unknown as ConfigService,
      async () =>
        new Response(
          JSON.stringify({
            status: 'succeeded',
            candidate: {
              type: 'expense',
              amount: '86.00',
              currency: 'CNY',
              occurredAt: '2026-05-23T10:00:00.000+08:00',
              categoryName: null,
              accountHint: null,
              merchant: null,
              note: '买东西86',
              confidence: 0.78,
              missingFields: ['password'],
              reviewMessage: '请补充分类和账户后再确认',
            },
            rawResult: { provider: 'deterministic-parser' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    await expect(client.parseTextTransaction(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('aborts the internal AI service request when the configured timeout is reached', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const client = new AiInternalClient(
      {
        get: jest.fn((key: string) => {
          if (key === 'AI_SERVICE_BASE_URL') {
            return 'http://127.0.0.1:8000';
          }
          if (key === 'AI_SERVICE_TIMEOUT_MS') {
            return '25';
          }
          return undefined;
        }),
      } as unknown as ConfigService,
      fetchImpl as unknown as typeof fetch,
    );

    const promise = expect(client.parseTextTransaction(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await jest.advanceTimersByTimeAsync(25);
    await promise;
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/internal/ai/text-transaction',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    jest.useRealTimers();
  });
});
