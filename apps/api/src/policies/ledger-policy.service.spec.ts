import { LedgerPolicyService } from './ledger-policy.service';

describe('LedgerPolicyService', () => {
  const activeLedger = { id: 'ledger_1', archivedAt: null };
  let prisma: {
    ledger: { findUnique: jest.Mock };
    ledgerMember: { findUnique: jest.Mock };
    account: { findUnique: jest.Mock };
    transaction: { findUnique: jest.Mock };
  };
  let service: LedgerPolicyService;

  beforeEach(() => {
    prisma = {
      ledger: { findUnique: jest.fn().mockResolvedValue(activeLedger) },
      ledgerMember: { findUnique: jest.fn() },
      account: { findUnique: jest.fn() },
      transaction: { findUnique: jest.fn() },
    };
    service = new LedgerPolicyService(prisma as never);
  });

  it('allows active members to view ledgers', async () => {
    prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'viewer', status: 'active' });

    await expect(service.canViewLedger('user_1', 'ledger_1')).resolves.toBe(true);
  });

  it('denies removed members', async () => {
    prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'removed' });

    await expect(service.canViewLedger('user_1', 'ledger_1')).resolves.toBe(false);
  });

  it('allows only owner and admin to manage ledger', async () => {
    prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'active' });
    await expect(service.canManageLedger('user_1', 'ledger_1')).resolves.toBe(false);

    prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'admin', status: 'active' });
    await expect(service.canManageLedger('user_1', 'ledger_1')).resolves.toBe(true);
  });

  it('allows owner admin and editor to create transactions', async () => {
    prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'active' });
    await expect(service.canCreateTransaction('user_1', 'ledger_1')).resolves.toBe(true);

    prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'viewer', status: 'active' });
    await expect(service.canCreateTransaction('user_1', 'ledger_1')).resolves.toBe(false);
  });

  it('denies archived ledgers', async () => {
    prisma.ledger.findUnique.mockResolvedValue({ id: 'ledger_1', archivedAt: new Date() });
    prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'owner', status: 'active' });

    await expect(service.canViewLedger('user_1', 'ledger_1')).resolves.toBe(false);
  });

  describe('account policies', () => {
    it('allows active ledger members to view shared accounts', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'account_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        ownerId: 'user_2',
        archivedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'viewer', status: 'active' });

      await expect(service.canViewAccount('user_1', 'account_1')).resolves.toBe(true);
    });

    it('allows only the owner to view private accounts', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'account_1',
        ledgerId: 'ledger_1',
        visibility: 'private',
        ownerId: 'user_1',
        archivedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'owner', status: 'active' });

      await expect(service.canViewAccount('user_1', 'account_1')).resolves.toBe(true);

      prisma.account.findUnique.mockResolvedValue({
        id: 'account_1',
        ledgerId: 'ledger_1',
        visibility: 'private',
        ownerId: 'user_2',
        archivedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'admin', status: 'active' });

      await expect(service.canViewAccount('user_1', 'account_1')).resolves.toBe(false);
    });

    it('denies archived accounts', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'account_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        ownerId: 'user_1',
        archivedAt: new Date(),
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'owner', status: 'active' });

      await expect(service.canViewAccount('user_1', 'account_1')).resolves.toBe(false);
    });

    it('denies removed ledger members from viewing shared accounts', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'account_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        ownerId: 'user_2',
        archivedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'removed' });

      await expect(service.canViewAccount('user_1', 'account_1')).resolves.toBe(false);
    });
  });

  describe('transaction policies', () => {
    it('allows active ledger members to view shared transactions', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        createdBy: 'user_2',
        deletedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'viewer', status: 'active' });

      await expect(service.canViewTransaction('user_1', 'transaction_1')).resolves.toBe(true);
    });

    it('allows only the creator to view private transactions', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'private',
        createdBy: 'user_1',
        deletedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'active' });

      await expect(service.canViewTransaction('user_1', 'transaction_1')).resolves.toBe(true);

      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'private',
        createdBy: 'user_2',
        deletedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'owner', status: 'active' });

      await expect(service.canViewTransaction('user_1', 'transaction_1')).resolves.toBe(false);
    });

    it('allows owners and admins to update shared transactions', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        createdBy: 'user_3',
        deletedAt: null,
      });

      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'owner', status: 'active' });
      await expect(service.canUpdateTransaction('user_1', 'transaction_1')).resolves.toBe(true);

      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'admin', status: 'active' });
      await expect(service.canUpdateTransaction('user_2', 'transaction_1')).resolves.toBe(true);
    });

    it('allows editors to update only their own shared transactions', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        createdBy: 'user_1',
        deletedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'active' });

      await expect(service.canUpdateTransaction('user_1', 'transaction_1')).resolves.toBe(true);

      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        createdBy: 'user_2',
        deletedAt: null,
      });

      await expect(service.canUpdateTransaction('user_1', 'transaction_1')).resolves.toBe(false);
    });

    it('denies viewers from updating shared transactions', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        createdBy: 'user_1',
        deletedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'viewer', status: 'active' });

      await expect(service.canUpdateTransaction('user_1', 'transaction_1')).resolves.toBe(false);
    });

    it('allows only the creator to update private transactions', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'private',
        createdBy: 'user_1',
        deletedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'editor', status: 'active' });

      await expect(service.canUpdateTransaction('user_1', 'transaction_1')).resolves.toBe(true);

      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'private',
        createdBy: 'user_2',
        deletedAt: null,
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'owner', status: 'active' });

      await expect(service.canUpdateTransaction('user_1', 'transaction_1')).resolves.toBe(false);
    });

    it('denies deleted transactions', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'transaction_1',
        ledgerId: 'ledger_1',
        visibility: 'ledger',
        createdBy: 'user_1',
        deletedAt: new Date(),
      });
      prisma.ledgerMember.findUnique.mockResolvedValue({ role: 'owner', status: 'active' });

      await expect(service.canViewTransaction('user_1', 'transaction_1')).resolves.toBe(false);
      await expect(service.canUpdateTransaction('user_1', 'transaction_1')).resolves.toBe(false);
    });
  });
});
