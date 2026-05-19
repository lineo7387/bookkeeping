import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfirmAiExtractionDto } from './dto/confirm-ai-extraction.dto';
import { ListAiTasksQueryDto } from './dto/list-ai-tasks-query.dto';
import { ParseAiTextDto } from './dto/parse-ai-text.dto';
import { RejectAiExtractionDto } from './dto/reject-ai-extraction.dto';

describe('AI DTO validation', () => {
  it('rejects empty input text', async () => {
    const dto = plainToInstance(ParseAiTextDto, { inputText: '' });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'inputText' })]),
    );
  });

  it('rejects input text longer than 500 characters', async () => {
    const dto = plainToInstance(ParseAiTextDto, { inputText: '记'.repeat(501) });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'inputText' })]),
    );
  });

  it('accepts optional locale timezone and defaultCurrency', async () => {
    const dto = plainToInstance(ParseAiTextDto, {
      inputText: '今天晚饭花了86，微信支付',
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      defaultCurrency: 'CNY',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects source in confirm payloads', async () => {
    const dto = plainToInstance(ConfirmAiExtractionDto, {
      ledgerId: 'ledger_1',
      accountId: 'account_1',
      categoryId: 'category_1',
      amount: '86.00',
      occurredAt: '2026-05-19T11:00:00.000Z',
      visibility: 'ledger',
      note: '晚饭',
      source: 'ai_text',
    });

    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'source' })]),
    );
  });

  it('accepts bounded list pagination and optional reject reason', async () => {
    const query = plainToInstance(ListAiTasksQueryDto, { limit: 20, offset: 0 });
    const reject = plainToInstance(RejectAiExtractionDto, { reason: '金额不准确' });

    await expect(validate(query)).resolves.toHaveLength(0);
    await expect(validate(reject)).resolves.toHaveLength(0);
  });
});
