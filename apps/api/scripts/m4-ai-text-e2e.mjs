import { pathToFileURL } from 'node:url';

const DEFAULT_API_URL = 'http://127.0.0.1:3000/api';
const DEFAULT_PASSWORD = 'LocalM4AiText123!';
const DEFAULT_INPUT_TEXT = '今天晚饭花了86，微信支付';
const DEFAULT_LEDGER_NAME = 'M4 AI 文本联调账本';

const OPTION_NAMES = new Set(['api-url', 'email', 'password', 'nickname', 'input-text', 'ledger-name']);

class ApiRequestError extends Error {
  constructor(message, { status, statusText, body } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export function parseArgs(argv) {
  const values = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--') {
      continue;
    }

    if (!key.startsWith('--')) {
      throw new Error(`Unexpected argument: ${key}`);
    }

    const optionName = key.slice(2);
    if (!OPTION_NAMES.has(optionName)) {
      throw new Error(`Unknown option: ${key}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${key} requires a value`);
    }

    values[toCamelCase(optionName)] = value;
    index += 1;
  }

  return values;
}

export function buildRunConfig(input, options = {}) {
  const now = options.now ?? new Date();
  const apiUrl = trimTrailingSlash(
    String(input.apiUrl ?? process.env.BOOKKEEPING_API_URL ?? process.env.API_URL ?? DEFAULT_API_URL).trim(),
  );
  const email = String(input.email ?? `m4-ai-e2e+${formatTimestamp(now)}@example.test`)
    .trim()
    .toLowerCase();
  const password = String(input.password ?? DEFAULT_PASSWORD);
  const nickname = String(input.nickname ?? 'M4 AI E2E User').trim() || 'M4 AI E2E User';
  const inputText = String(input.inputText ?? DEFAULT_INPUT_TEXT).trim();
  const ledgerName = String(input.ledgerName ?? DEFAULT_LEDGER_NAME).trim() || DEFAULT_LEDGER_NAME;

  if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    throw new Error('--api-url must start with http:// or https://');
  }

  if (!email || !email.includes('@')) {
    throw new Error('--email must be a valid email address');
  }

  if (password.length < 8) {
    throw new Error('--password must be at least 8 characters');
  }

  if (!inputText) {
    throw new Error('--input-text must not be empty');
  }

  return {
    apiUrl,
    email,
    password,
    nickname,
    inputText,
    ledgerName,
    accountName: '微信',
    accountType: 'wechat',
    categoryName: '餐饮',
    defaultCurrency: 'CNY',
    timezone: 'Asia/Shanghai',
  };
}

export async function extractApiData(response) {
  const body = response.body;
  if (!response.ok || body?.success === false) {
    const code = body?.error?.code ?? 'HTTP_ERROR';
    const message = body?.error?.message ?? 'Request failed';
    throw new ApiRequestError(`HTTP ${response.status} ${response.statusText}: ${code} - ${message}`, {
      status: response.status,
      statusText: response.statusText,
      body,
    });
  }

  if (!body || body.success !== true) {
    throw new ApiRequestError(`HTTP ${response.status} ${response.statusText}: invalid API response`, {
      status: response.status,
      statusText: response.statusText,
      body,
    });
  }

  return body.data;
}

export async function runM4AiTextE2e(config, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('This script requires a Node.js runtime with global fetch support');
  }

  const api = createApiClient(config.apiUrl, fetchImpl);
  console.log(`Using NestJS API: ${config.apiUrl}`);
  console.log('FastAPI is exercised only through the NestJS AI module.');

  const auth = await registerOrLogin(api, config);
  const token = auth.accessToken;
  console.log(`Authenticated local test user: ${config.email}`);

  const ledger = await api.post('/ledgers', token, {
    name: `${config.ledgerName} ${formatTimestamp(new Date())}`,
    type: 'personal',
    defaultCurrency: config.defaultCurrency,
    timezone: config.timezone,
  });
  console.log(`Created ledger: ${ledger.id}`);

  const account = await api.post(`/ledgers/${ledger.id}/accounts`, token, {
    name: config.accountName,
    type: config.accountType,
    currency: config.defaultCurrency,
    initialBalance: '200.00',
    visibility: 'ledger',
  });
  console.log(`Created account: ${account.id}`);

  const category = await api.post(`/ledgers/${ledger.id}/categories`, token, {
    type: 'expense',
    name: config.categoryName,
  });
  console.log(`Created expense category: ${category.id}`);

  const beforeTransactions = await api.get(`/ledgers/${ledger.id}/transactions`, token);
  assertArrayLength(beforeTransactions, 0, 'new e2e ledger should start without transactions');

  const parseResult = await api.post(`/ledgers/${ledger.id}/ai/text-parse`, token, {
    inputText: config.inputText,
    locale: 'zh-CN',
    timezone: config.timezone,
    defaultCurrency: config.defaultCurrency,
  });
  if (parseResult.status !== 'succeeded' || !parseResult.extraction?.id) {
    throw new Error(`Expected succeeded AI parse with extraction, received ${JSON.stringify(parseResult)}`);
  }
  console.log(`Created AI task: ${parseResult.taskId}`);

  const candidate = parseResult.extraction.candidate;
  const confirmResult = await api.post(`/ai/extractions/${parseResult.extraction.id}/confirm`, token, {
    ledgerId: ledger.id,
    accountId: account.id,
    categoryId: category.id,
    amount: candidate.amount,
    occurredAt: candidate.occurredAt,
    visibility: 'ledger',
    note: candidate.note ?? 'M4 AI text e2e',
  });
  const transaction = getConfirmedTransaction(confirmResult);
  if (transaction.source !== 'ai_text') {
    throw new Error(`Expected confirmed transaction source ai_text, received ${transaction.source}`);
  }
  console.log(`Confirmed AI extraction into transaction: ${transaction.id}`);

  const afterTransactions = await api.get(`/ledgers/${ledger.id}/transactions`, token);
  assertArrayLength(afterTransactions, 1, 'confirmed AI extraction should create one transaction');
  if (afterTransactions[0].id !== transaction.id) {
    throw new Error('Transaction list did not include the confirmed AI transaction');
  }

  const accounts = await api.get(`/ledgers/${ledger.id}/accounts`, token);
  const updatedAccount = accounts.find((item) => item.id === account.id);
  if (!updatedAccount || !decimalStringsEqual(updatedAccount.currentBalance, '114.00')) {
    throw new Error(
      `Expected account balance 114.00 after expense confirmation, received ${
        updatedAccount?.currentBalance ?? 'missing account'
      }`,
    );
  }
  console.log('Verified transaction list and account balance update.');

  return {
    userEmail: config.email,
    ledgerId: ledger.id,
    aiTaskId: parseResult.taskId,
    extractionId: parseResult.extraction.id,
    transactionId: transaction.id,
  };
}

export function getConfirmedTransaction(confirmResult) {
  if (!confirmResult?.transaction) {
    throw new Error(`Expected confirmation result to include transaction, received ${JSON.stringify(confirmResult)}`);
  }

  return confirmResult.transaction;
}

export function decimalStringsEqual(actual, expected) {
  return decimalToCents(actual) === decimalToCents(expected);
}

function createApiClient(apiUrl, fetchImpl) {
  return {
    get(path, token) {
      return requestJson(fetchImpl, apiUrl, 'GET', path, token);
    },
    post(path, token, body) {
      return requestJson(fetchImpl, apiUrl, 'POST', path, token, body);
    },
  };
}

async function requestJson(fetchImpl, apiUrl, method, path, token, body) {
  let response;
  try {
    response = await fetchImpl(`${apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Unable to reach NestJS API at ${apiUrl}. Start apps/api first and ensure AI_SERVICE_BASE_URL points to FastAPI. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return extractApiData({
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: await readResponseBody(response),
  });
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: { code: 'INVALID_JSON', message: text.slice(0, 200) } };
  }
}

async function registerOrLogin(api, config) {
  try {
    return await api.post('/auth/register', null, {
      email: config.email,
      password: config.password,
      nickname: config.nickname,
    });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || !String(error.message).includes('Email is already registered')) {
      throw error;
    }

    return api.post('/auth/login', null, {
      email: config.email,
      password: config.password,
    });
  }
}

function assertArrayLength(value, expectedLength, label) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`${label}: expected ${expectedLength}, received ${Array.isArray(value) ? value.length : 'non-array'}`);
  }
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function formatTimestamp(date) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}

function decimalToCents(value) {
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error(`Invalid decimal string: ${value}`);
  }

  const sign = match[1] === '-' ? -1n : 1n;
  const units = BigInt(match[2]);
  const cents = BigInt((match[3] ?? '').padEnd(2, '0'));
  return sign * (units * 100n + cents);
}

async function main() {
  const config = buildRunConfig(parseArgs(process.argv.slice(2)));
  const result = await runM4AiTextE2e(config);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
