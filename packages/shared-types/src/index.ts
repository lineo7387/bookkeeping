export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'TOKEN_EXPIRED'
  | 'LEDGER_NOT_FOUND'
  | 'LEDGER_ACCESS_DENIED'
  | 'MEMBER_ROLE_DENIED'
  | 'ACCOUNT_NOT_FOUND'
  | 'PRIVATE_RESOURCE_DENIED'
  | 'VALIDATION_FAILED'
  | 'AI_TASK_FAILED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      error?: never;
    }
  | {
      success: false;
      data?: never;
      error: ApiError;
    };

export type LedgerRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type LedgerPermission =
  | 'ledger:view'
  | 'ledger:manage'
  | 'member:invite'
  | 'member:manage'
  | 'account:create'
  | 'account:update'
  | 'category:create'
  | 'category:update'
  | 'budget:manage'
  | 'transaction:create'
  | 'transaction:update'
  | 'transaction:delete'
  | 'transaction:view';

export interface LedgerSummary {
  id: string;
  name: string;
  type: 'personal' | 'family';
  defaultCurrency: string;
  timezone: string;
  currentMember: {
    role: LedgerRole;
    permissions: LedgerPermission[];
  };
}

export type AccountType = 'cash' | 'bank_card' | 'alipay' | 'wechat' | 'credit_card' | 'other';

export type AccountVisibility = 'ledger' | 'private';

export interface AccountSummary {
  id: string;
  ledgerId: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: string;
  currentBalance: string;
  visibility: AccountVisibility;
  ownerId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = 'income' | 'expense';

export interface CategorySummary {
  id: string;
  ledgerId: string;
  parentId: string | null;
  type: CategoryType;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionVisibility = 'ledger' | 'private' | 'selected_members';

export type TransactionSource = 'manual' | 'ai_text' | 'ocr' | 'import';

export interface TransactionSummary {
  id: string;
  ledgerId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  occurredAt: string;
  merchant: string | null;
  note: string | null;
  visibility: TransactionVisibility;
  createdBy: string;
  source: TransactionSource;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type AiTaskStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export type AiExtractionStatus = 'pending' | 'confirmed' | 'rejected';

export interface AiCandidateReceiptItem {
  name: string;
  quantity: string | null;
  unitPrice: string | null;
  amount: string;
}

export interface AiCandidateReceipt {
  invoiceNo: string | null;
  taxNo: string | null;
  items: AiCandidateReceiptItem[];
}

export interface AiCandidateTransaction {
  ledgerId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  occurredAt: string;
  visibility: TransactionVisibility;
  categoryName: string | null;
  accountHint: string | null;
  merchant: string | null;
  note: string | null;
  confidence: number;
  receipt?: AiCandidateReceipt;
}

export interface AiExtractionSummary {
  id: string;
  taskId: string;
  ledgerId: string;
  status: AiExtractionStatus;
  candidate: AiCandidateTransaction;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}
