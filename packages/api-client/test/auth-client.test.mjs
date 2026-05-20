import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApiClient } from '../dist/index.js';

describe('BookkeepingApiClient auth resources', () => {
  it('posts login credentials to NestJS auth endpoint', async () => {
    const calls = [];
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      fetch: async (url, init) => {
        calls.push({ url, init });
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'user_1',
                email: 'admin@example.com',
                nickname: 'Admin',
                avatarUrl: null,
                status: 'active',
                createdAt: '2026-05-20T00:00:00.000Z',
                updatedAt: '2026-05-20T00:00:00.000Z',
              },
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    const response = await client.login({
      email: 'admin@example.com',
      password: 'password123',
    });

    assert.equal(response.success, true);
    assert.equal(calls[0].url, 'https://api.example.test/auth/login');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.get('Content-Type'), 'application/json');
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      email: 'admin@example.com',
      password: 'password123',
    });
  });
});
