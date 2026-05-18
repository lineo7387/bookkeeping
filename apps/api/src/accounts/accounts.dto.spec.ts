import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

describe('Account DTO validation', () => {
  it('accepts normal create account decimal strings', async () => {
    const dto = plainToInstance(CreateAccountDto, {
      name: '现金',
      type: 'cash',
      initialBalance: '1234567890123456.78',
      currentBalance: '-99.01',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects create account decimals with too much precision or too many integer digits', async () => {
    const overPrecision = plainToInstance(CreateAccountDto, {
      name: '现金',
      type: 'cash',
      initialBalance: '1.234',
    });
    const oversized = plainToInstance(CreateAccountDto, {
      name: '现金',
      type: 'cash',
      currentBalance: '12345678901234567.12',
    });

    await expect(validate(overPrecision)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'initialBalance' })]),
    );
    await expect(validate(oversized)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'currentBalance' })]),
    );
  });

  it('accepts normal update account decimal strings', async () => {
    const dto = plainToInstance(UpdateAccountDto, {
      initialBalance: '0',
      currentBalance: '9999999999999999.99',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects update account decimals with too much precision or too many integer digits', async () => {
    const overPrecision = plainToInstance(UpdateAccountDto, {
      initialBalance: '-1.234',
    });
    const oversized = plainToInstance(UpdateAccountDto, {
      currentBalance: '12345678901234567',
    });

    await expect(validate(overPrecision)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'initialBalance' })]),
    );
    await expect(validate(oversized)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'currentBalance' })]),
    );
  });
});
