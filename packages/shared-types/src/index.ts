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

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionVisibility = 'ledger' | 'private' | 'selected_members';

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
