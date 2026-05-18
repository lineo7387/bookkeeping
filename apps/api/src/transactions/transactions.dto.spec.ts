import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

describe('Transaction DTO validation', () => {
  it('accepts normal create transaction decimal strings and ISO dates', async () => {
    const dto = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: '1234567890123456.78',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
      visibility: 'ledger',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects zero, negative, over-precision, and oversized create amounts', async () => {
    const zero = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: '0',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
    });
    const negative = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: '-1.00',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
    });
    const overPrecision = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: '1.234',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
    });
    const oversized = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: '12345678901234567.12',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
    });

    await expect(validate(zero)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ property: 'amount' })]));
    await expect(validate(negative)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'amount' })]),
    );
    await expect(validate(overPrecision)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'amount' })]),
    );
    await expect(validate(oversized)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'amount' })]),
    );
  });

  it('rejects selected_members and source in public create payloads', async () => {
    const selectedMembers = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: '86.00',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
      visibility: 'selected_members',
    });
    const sourcePayload = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amount: '86.00',
      occurredAt: '2026-05-18T10:00:00.000Z',
      accountId: 'account_1',
      categoryId: 'category_1',
      source: 'ocr',
    });

    await expect(validate(selectedMembers)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'visibility' })]),
    );
    await expect(validate(sourcePayload, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'source' })]),
    );
  });

  it('accepts bounded list filters and rejects unsafe pagination bounds', async () => {
    const valid = plainToInstance(ListTransactionsQueryDto, {
      type: 'expense',
      accountId: 'account_1',
      categoryId: 'category_1',
      occurredFrom: '2026-05-01T00:00:00.000Z',
      occurredTo: '2026-05-31T23:59:59.999Z',
      limit: 50,
      offset: 0,
    });
    const invalid = plainToInstance(ListTransactionsQueryDto, {
      limit: 501,
      offset: -1,
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'limit' }),
        expect.objectContaining({ property: 'offset' }),
      ]),
    );
  });

  it('validates update amounts and does not expose source changes', async () => {
    const valid = plainToInstance(UpdateTransactionDto, {
      amount: '1.00',
      occurredAt: '2026-05-18T10:00:00.000Z',
      visibility: 'private',
    });
    const invalid = plainToInstance(UpdateTransactionDto, {
      amount: '0',
      visibility: 'selected_members',
      source: 'import',
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    await expect(validate(invalid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'amount' }),
        expect.objectContaining({ property: 'visibility' }),
        expect.objectContaining({ property: 'source' }),
      ]),
    );
  });
});
