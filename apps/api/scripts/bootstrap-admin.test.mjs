import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeBootstrapAdminInput, parseBootstrapAdminArgs } from './bootstrap-admin.mjs';

describe('bootstrap-admin script input handling', () => {
  it('parses explicit CLI arguments and normalizes email', () => {
    const input = parseBootstrapAdminArgs([
      '--email',
      'Admin@Example.COM',
      '--password',
      'StrongPass123',
      '--nickname',
      '系统管理员',
    ]);

    assert.deepEqual(input, {
      email: 'admin@example.com',
      password: 'StrongPass123',
      nickname: '系统管理员',
    });
  });

  it('uses a default nickname when omitted', () => {
    const input = parseBootstrapAdminArgs([
      '--email',
      'admin@example.com',
      '--password',
      'StrongPass123',
    ]);

    assert.equal(input.nickname, 'System Admin');
  });

  it('ignores pnpm argument delimiter', () => {
    const input = parseBootstrapAdminArgs([
      '--',
      '--email',
      'admin@example.com',
      '--password',
      'StrongPass123',
    ]);

    assert.equal(input.email, 'admin@example.com');
  });

  it('rejects missing and weak credentials before touching the database', () => {
    assert.throws(
      () => normalizeBootstrapAdminInput({ email: '', password: 'StrongPass123' }),
      /--email is required/,
    );
    assert.throws(
      () => normalizeBootstrapAdminInput({ email: 'admin@example.com', password: 'short' }),
      /--password must be at least 8 characters/,
    );
  });
});
