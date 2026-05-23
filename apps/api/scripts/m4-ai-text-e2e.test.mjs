import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRunConfig,
  decimalStringsEqual,
  extractApiData,
  getConfirmedTransaction,
  parseArgs,
} from './m4-ai-text-e2e.mjs';

describe('m4-ai-text-e2e script helpers', () => {
  it('builds a local run config with safe defaults', () => {
    const config = buildRunConfig(parseArgs([]), {
      now: new Date('2026-05-22T10:30:00.000Z'),
    });

    assert.equal(config.apiUrl, 'http://127.0.0.1:3000/api');
    assert.equal(config.email, 'm4-ai-e2e+20260522103000@example.test');
    assert.equal(config.password, 'LocalM4AiText123!');
    assert.equal(config.inputText, '今天晚饭花了86，微信支付');
    assert.equal(config.ledgerName, 'M4 AI 文本联调账本');
  });

  it('normalizes explicit options and ignores the pnpm delimiter', () => {
    const config = buildRunConfig(
      parseArgs([
        '--',
        '--api-url',
        'http://localhost:3001/api/',
        '--email',
        'Test@Example.COM',
        '--password',
        'StrongPass123',
        '--input-text',
        '发工资12000',
      ]),
      { now: new Date('2026-05-22T10:30:00.000Z') },
    );

    assert.equal(config.apiUrl, 'http://localhost:3001/api');
    assert.equal(config.email, 'test@example.com');
    assert.equal(config.password, 'StrongPass123');
    assert.equal(config.inputText, '发工资12000');
  });

  it('rejects malformed CLI options before making network requests', () => {
    assert.throws(() => parseArgs(['--api-url']), /--api-url requires a value/);
    assert.throws(
      () => buildRunConfig(parseArgs(['--email', 'not-an-email']), { now: new Date() }),
      /--email must be a valid email address/,
    );
    assert.throws(
      () => buildRunConfig(parseArgs(['--password', 'short']), { now: new Date() }),
      /--password must be at least 8 characters/,
    );
  });

  it('extracts successful API data and formats failed responses', async () => {
    await assert.rejects(
      () =>
        extractApiData({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          body: {
            success: false,
            error: { code: 'AI_TASK_FAILED', message: 'AI parsing failed' },
          },
        }),
      /HTTP 400 Bad Request: AI_TASK_FAILED - AI parsing failed/,
    );

    assert.deepEqual(
      await extractApiData({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: { success: true, data: { id: 'entity_1' } },
      }),
      { id: 'entity_1' },
    );
  });

  it('reads the confirmed transaction from the API confirmation result', () => {
    const transaction = getConfirmedTransaction({
      ledgerId: 'ledger_1',
      transactionId: 'transaction_1',
      extraction: { id: 'extraction_1' },
      transaction: {
        id: 'transaction_1',
        source: 'ai_text',
      },
    });

    assert.deepEqual(transaction, {
      id: 'transaction_1',
      source: 'ai_text',
    });
  });

  it('compares decimal strings without requiring trailing zero formatting', () => {
    assert.equal(decimalStringsEqual('114', '114.00'), true);
    assert.equal(decimalStringsEqual('114.0', '114.00'), true);
    assert.equal(decimalStringsEqual('114.01', '114.00'), false);
  });
});
