import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApiClient } from '../dist/index.js';

describe('BookkeepingApiClient AI resources', () => {
  it('parseAiText posts to NestJS ledger AI endpoint with bearer token', async () => {
    const calls = [];
    const client = createClient(calls, {
      taskId: 'task_1',
      ledgerId: 'ledger_1',
      status: 'succeeded',
      extraction: null,
    });

    const response = await client.parseAiText('ledger_1', {
      inputText: '今天晚饭花了86',
      locale: 'zh-CN',
    });

    assert.equal(response.success, true);
    assert.equal(calls[0].url, 'https://api.example.test/ledgers/ledger_1/ai/text-parse');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer access-token');
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      inputText: '今天晚饭花了86',
      locale: 'zh-CN',
    });
  });

  it('getAiTask reads NestJS task detail endpoint', async () => {
    const calls = [];
    const client = createClient(calls, {
      id: 'task_1',
      ledgerId: 'ledger_1',
      type: 'text_parse',
      status: 'succeeded',
      errorMessage: null,
      extraction: null,
      createdAt: '2026-05-19T11:00:00.000Z',
      updatedAt: '2026-05-19T11:01:00.000Z',
    });

    await client.getAiTask('task_1');

    assert.equal(calls[0].url, 'https://api.example.test/ai/tasks/task_1');
    assert.equal(calls[0].init.method, 'GET');
  });

  it('listLedgerAiTasks reads NestJS ledger task endpoint', async () => {
    const calls = [];
    const client = createClient(calls, { items: [], limit: 20, offset: 0 });

    await client.listLedgerAiTasks('ledger_1', { limit: 20, offset: 0 });

    assert.equal(calls[0].url, 'https://api.example.test/ledgers/ledger_1/ai/tasks?limit=20&offset=0');
    assert.equal(calls[0].init.method, 'GET');
  });

  it('confirmAiExtraction posts confirmation payload', async () => {
    const calls = [];
    const client = createClient(calls, {
      ledgerId: 'ledger_1',
      transactionId: 'transaction_1',
      extraction: { id: 'extraction_1' },
    });

    await client.confirmAiExtraction('extraction_1', {
      ledgerId: 'ledger_1',
      accountId: 'account_1',
      categoryId: 'category_1',
      amount: '86.00',
    });

    assert.equal(calls[0].url, 'https://api.example.test/ai/extractions/extraction_1/confirm');
    assert.equal(calls[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      ledgerId: 'ledger_1',
      accountId: 'account_1',
      categoryId: 'category_1',
      amount: '86.00',
    });
  });

  it('rejectAiExtraction posts rejection payload', async () => {
    const calls = [];
    const client = createClient(calls, { id: 'extraction_1', status: 'rejected' });

    await client.rejectAiExtraction('extraction_1', { reason: '金额不准确' });

    assert.equal(calls[0].url, 'https://api.example.test/ai/extractions/extraction_1/reject');
    assert.equal(calls[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(calls[0].init.body), { reason: '金额不准确' });
  });
});

function createClient(calls, data) {
  return createApiClient({
    baseUrl: 'https://api.example.test/',
    getAccessToken: () => 'access-token',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
}
