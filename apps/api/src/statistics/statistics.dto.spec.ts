import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CategoryStatisticsQueryDto } from './dto/category-statistics-query.dto';
import { StatisticsDateRangeQueryDto } from './dto/statistics-date-range-query.dto';

describe('Statistics DTO validation', () => {
  it('accepts timezone-aware date range filters', async () => {
    const dto = plainToInstance(StatisticsDateRangeQueryDto, {
      occurredFrom: '2026-05-01T00:00:00.000Z',
      occurredTo: '2026-05-31T23:59:59.999+08:00',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects date range filters without timezone', async () => {
    const dto = plainToInstance(StatisticsDateRangeQueryDto, {
      occurredFrom: '2026-05-01T00:00:00',
    });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'occurredFrom' })]),
    );
  });

  it('defaults category statistics to expense and accepts income', async () => {
    const defaultDto = plainToInstance(CategoryStatisticsQueryDto, {});
    const incomeDto = plainToInstance(CategoryStatisticsQueryDto, { type: 'income' });

    expect(defaultDto.type).toBe('expense');
    await expect(validate(defaultDto)).resolves.toHaveLength(0);
    await expect(validate(incomeDto)).resolves.toHaveLength(0);
  });

  it('rejects transfer category statistics', async () => {
    const dto = plainToInstance(CategoryStatisticsQueryDto, { type: 'transfer' });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'type' })]),
    );
  });
});
