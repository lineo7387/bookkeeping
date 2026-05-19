import { AiRepository } from './ai.repository';

describe('AiRepository', () => {
  it('creates a text parse task with processing status', async () => {
    const prisma = {
      aiTask: {
        create: jest.fn().mockResolvedValue({
          id: 'task_1',
          ledgerId: 'ledger_1',
          userId: 'user_1',
          type: 'text_parse',
          status: 'processing',
          inputText: '今天晚饭花了86，微信支付',
          inputFileUrl: null,
          errorMessage: null,
          createdAt: new Date('2026-05-19T11:00:00.000Z'),
          updatedAt: new Date('2026-05-19T11:00:00.000Z'),
          extractions: [],
        }),
      },
    };
    const repository = new AiRepository(prisma as never);

    await expect(
      repository.createTextParseTask({
        ledgerId: 'ledger_1',
        userId: 'user_1',
        inputText: '今天晚饭花了86，微信支付',
      }),
    ).resolves.toMatchObject({ id: 'task_1', status: 'processing' });

    expect(prisma.aiTask.create).toHaveBeenCalledWith({
      data: {
        ledgerId: 'ledger_1',
        userId: 'user_1',
        type: 'text_parse',
        status: 'processing',
        inputText: '今天晚饭花了86，微信支付',
      },
      include: { extractions: true },
    });
  });
});
