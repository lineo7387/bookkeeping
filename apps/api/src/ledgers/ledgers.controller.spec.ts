import { LedgersController } from './ledgers.controller';
import { LedgersService } from './ledgers.service';

describe('LedgersController', () => {
  it('wraps create ledger result', async () => {
    const ledgersService = {
      createLedger: jest.fn().mockResolvedValue({
        id: 'ledger_1',
        name: '家庭账本',
        type: 'family',
        defaultCurrency: 'CNY',
        timezone: 'Asia/Shanghai',
        currentMember: { role: 'owner', permissions: ['ledger:view'] },
      }),
    } as unknown as jest.Mocked<LedgersService>;
    const controller = new LedgersController(ledgersService);

    await expect(
      controller.create(
        { id: 'user_1', email: 'lineo@example.com' },
        { name: '家庭账本', type: 'family', defaultCurrency: 'CNY', timezone: 'Asia/Shanghai' },
      ),
    ).resolves.toMatchObject({
      success: true,
      data: { id: 'ledger_1', currentMember: { role: 'owner' } },
    });
    expect(ledgersService.createLedger).toHaveBeenCalledWith('user_1', {
      name: '家庭账本',
      type: 'family',
      defaultCurrency: 'CNY',
      timezone: 'Asia/Shanghai',
    });
  });
});
