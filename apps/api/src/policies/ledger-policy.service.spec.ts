import { LedgerPolicyService } from './ledger-policy.service';

describe('LedgerPolicyService', () => {
  const activeLedger = { id: 'ledger_1', archivedAt: null };
  let prisma: {
    ledger: { findUnique: jest.Mock };
    ledgerMember: { findUnique: jest.Mock };
  };
  let service: LedgerPolicyService;

  beforeEach(() => {
    prisma = {
      ledger: { findUnique: jest.fn().mockResolvedValue(activeLedger) },
      ledgerMember: { findUnique: jest.fn() },
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
});
