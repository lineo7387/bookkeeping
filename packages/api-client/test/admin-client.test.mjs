import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApiClient } from '../dist/index.js';

describe('BookkeepingApiClient admin resources', () => {
  it('requests admin users with pagination and bearer token', async () => {
    const calls = [];
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      getAccessToken: () => 'access-token',
      fetch: async (url, init) => {
        calls.push({ url, init });
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [],
              limit: 5,
              offset: 10,
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const response = await client.listAdminUsers({ limit: 5, offset: 10 });

    assert.equal(response.success, true);
    assert.equal(calls[0].url, 'https://api.example.test/admin/users?limit=5&offset=10');
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer access-token');
  });

  it('requests admin AI tasks with status and type filters', async () => {
    const calls = [];
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      fetch: async (url, init) => {
        calls.push({ url, init });
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [],
              limit: 10,
              offset: 0,
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const response = await client.listAdminAiTasks({ limit: 10, offset: 0, status: 'failed', type: 'text_parse' });

    assert.equal(response.success, true);
    assert.equal(
      calls[0].url,
      'https://api.example.test/admin/ai/tasks?limit=10&offset=0&status=failed&type=text_parse',
    );
    assert.equal(calls[0].init.method, 'GET');
  });
});
