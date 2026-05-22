import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import argon2 from 'argon2';
import pg from 'pg';

export function parseBootstrapAdminArgs(argv) {
  const values = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--') {
      continue;
    }

    if (!key.startsWith('--')) {
      throw new Error(`Unexpected argument: ${key}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${key} requires a value`);
    }

    values[key.slice(2)] = value;
    index += 1;
  }

  return normalizeBootstrapAdminInput(values);
}

export function normalizeBootstrapAdminInput(input) {
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const nickname = String(input.nickname ?? 'System Admin').trim() || 'System Admin';

  if (!email) {
    throw new Error('--email is required');
  }

  if (!email.includes('@')) {
    throw new Error('--email must be a valid email address');
  }

  if (password.length < 8) {
    throw new Error('--password must be at least 8 characters');
  }

  return { email, password, nickname };
}

export async function bootstrapAdmin(input, options = {}) {
  const normalized = normalizeBootstrapAdminInput(input);
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = options.client ?? new pg.Client({ connectionString });
  const shouldCloseClient = !options.client;

  try {
    await client.connect?.();
    const passwordHash = await argon2.hash(normalized.password);
    const result = await client.query(
      `insert into users (id, email, password_hash, nickname, status, is_system_admin, created_at, updated_at)
       values ($1, $2, $3, $4, 'active', true, now(), now())
       on conflict (email) do update set
         password_hash = excluded.password_hash,
         nickname = excluded.nickname,
         status = 'active',
         is_system_admin = true,
         updated_at = now()
       returning id, email, nickname, status, is_system_admin`,
      [randomUUID(), normalized.email, passwordHash, normalized.nickname],
    );

    return result.rows[0];
  } finally {
    if (shouldCloseClient) {
      await client.end?.();
    }
  }
}

async function main() {
  const input = parseBootstrapAdminArgs(process.argv.slice(2));
  const admin = await bootstrapAdmin(input);
  console.log(
    JSON.stringify(
      {
        id: admin.id,
        email: admin.email,
        nickname: admin.nickname,
        status: admin.status,
        isSystemAdmin: admin.is_system_admin,
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
