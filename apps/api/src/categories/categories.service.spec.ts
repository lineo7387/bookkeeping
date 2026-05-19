import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { CategorySummary } from '@bookkeeping/shared-types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';

type CategoriesRepositoryMock = jest.Mocked<
  Pick<
    CategoriesRepository,
    'listActiveByLedger' | 'create' | 'findActiveById' | 'update' | 'hasActiveChildren' | 'archive'
  > & {
    findActiveForUser: (userId: string, categoryId: string) => Promise<CategorySummary | null>;
  }
>;

describe('CategoriesService', () => {
  let repository: CategoriesRepositoryMock;
  let policy: jest.Mocked<Pick<LedgerPolicyService, 'canViewLedger' | 'canManageLedger'>>;
  let auditLogsService: jest.Mocked<Pick<AuditLogsService, 'record'>>;
  let service: CategoriesService;

  const categorySummary: CategorySummary = {
    id: 'category_1',
    ledgerId: 'ledger_1',
    parentId: null,
    type: 'expense',
    name: '餐饮',
    icon: 'utensils',
    color: '#F59E0B',
    isSystem: false,
    sortOrder: 10,
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  };

  beforeEach(() => {
    repository = {
      listActiveByLedger: jest.fn(),
      create: jest.fn(),
      findActiveById: jest.fn(),
      findActiveForUser: jest.fn(),
      update: jest.fn(),
      hasActiveChildren: jest.fn(),
      archive: jest.fn(),
    };
    policy = {
      canViewLedger: jest.fn(),
      canManageLedger: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn().mockResolvedValue({ id: 'audit_1' }),
    };
    service = new CategoriesService(
      repository as unknown as CategoriesRepository,
      policy as unknown as LedgerPolicyService,
      auditLogsService as unknown as AuditLogsService,
    );
    repository.findActiveForUser.mockImplementation((_userId, categoryId) => repository.findActiveById(categoryId));
  });

  it('lists categories only after checking ledger view access', async () => {
    policy.canViewLedger.mockResolvedValue(true);
    repository.listActiveByLedger.mockResolvedValue([categorySummary]);

    await expect(service.listCategories('user_1', 'ledger_1', { type: 'expense' })).resolves.toEqual([
      categorySummary,
    ]);

    expect(policy.canViewLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.listActiveByLedger).toHaveBeenCalledWith('ledger_1', 'expense');
  });

  it('denies listing categories when the user cannot view the ledger', async () => {
    policy.canViewLedger.mockResolvedValue(false);

    await expect(service.listCategories('user_1', 'ledger_1', {})).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'LEDGER_ACCESS_DENIED' } },
    });
    expect(repository.listActiveByLedger).not.toHaveBeenCalled();
  });

  it('requires ledger management before creating a category', async () => {
    policy.canManageLedger.mockResolvedValue(false);

    await expect(
      service.createCategory('user_1', 'ledger_1', {
        type: 'expense',
        name: '餐饮',
      }),
    ).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('requires parent category to belong to the same ledger and type', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue({ ...categorySummary, ledgerId: 'ledger_2', type: 'expense' });

    await expect(
      service.createCategory('user_1', 'ledger_1', {
        type: 'expense',
        name: '早餐',
        parentId: 'category_parent',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.create).not.toHaveBeenCalled();

    repository.findActiveById.mockResolvedValue({ ...categorySummary, ledgerId: 'ledger_1', type: 'income' });

    await expect(
      service.createCategory('user_1', 'ledger_1', {
        type: 'expense',
        name: '晚餐',
        parentId: 'category_parent',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a category after parent validation passes', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue({ ...categorySummary, id: 'category_parent' });
    repository.create.mockResolvedValue({ ...categorySummary, parentId: 'category_parent', name: '早餐' });

    await expect(
      service.createCategory('user_1', 'ledger_1', {
        type: 'expense',
        name: '早餐',
        parentId: 'category_parent',
        sortOrder: 20,
      }),
    ).resolves.toMatchObject({ id: 'category_1', parentId: 'category_parent', name: '早餐' });

    expect(repository.create).toHaveBeenCalledWith('ledger_1', {
      type: 'expense',
      name: '早餐',
      parentId: 'category_parent',
      sortOrder: 20,
    });
  });

  it('records an audit log after creating a category', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.create.mockResolvedValue(categorySummary);

    await service.createCategory('user_1', 'ledger_1', {
      type: 'expense',
      name: '餐饮',
      icon: 'utensils',
      color: '#F59E0B',
    });

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'category',
        targetId: 'category_1',
        action: 'category.create',
        metadata: expect.objectContaining({
          type: 'expense',
          name: '餐饮',
          icon: 'utensils',
          color: '#F59E0B',
        }),
      }),
    );
  });

  it('does not allow a category to use itself as parent', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(categorySummary);

    await expect(
      service.updateCategory('user_1', 'category_1', {
        parentId: 'category_1',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('requires ledger management before updating a category', async () => {
    policy.canManageLedger.mockResolvedValue(false);
    repository.findActiveById.mockResolvedValue(categorySummary);

    await expect(service.updateCategory('user_1', 'category_1', { name: '餐饮备用' })).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects update as validation when the category is not visible to the user', async () => {
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.findActiveForUser.mockResolvedValue(null);

    await expect(service.updateCategory('user_1', 'category_1', { name: '餐饮备用' })).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.findActiveForUser).toHaveBeenCalledWith('user_1', 'category_1');
    expect(policy.canManageLedger).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('still returns member role denied when a visible category user cannot manage the ledger', async () => {
    policy.canManageLedger.mockResolvedValue(false);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.findActiveForUser.mockResolvedValue(categorySummary);

    await expect(service.updateCategory('user_1', 'category_1', { name: '餐饮备用' })).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects update when a non-self parent belongs to another ledger', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById
      .mockResolvedValueOnce(categorySummary)
      .mockResolvedValueOnce({ ...categorySummary, id: 'category_parent', ledgerId: 'ledger_2' });

    await expect(
      service.updateCategory('user_1', 'category_1', {
        parentId: 'category_parent',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects update when a non-self parent has another type', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById
      .mockResolvedValueOnce(categorySummary)
      .mockResolvedValueOnce({ ...categorySummary, id: 'category_parent', type: 'income' });

    await expect(
      service.updateCategory('user_1', 'category_1', {
        parentId: 'category_parent',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates a category after management and parent validation pass', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById
      .mockResolvedValueOnce(categorySummary)
      .mockResolvedValueOnce({ ...categorySummary, id: 'category_parent' });
    repository.update.mockResolvedValue({
      ...categorySummary,
      parentId: 'category_parent',
      name: '早餐',
      sortOrder: 20,
    });

    await expect(
      service.updateCategory('user_1', 'category_1', {
        parentId: 'category_parent',
        name: '早餐',
        sortOrder: 20,
      }),
    ).resolves.toMatchObject({ id: 'category_1', parentId: 'category_parent', name: '早餐', sortOrder: 20 });

    expect(repository.update).toHaveBeenCalledWith('category_1', {
      parentId: 'category_parent',
      name: '早餐',
      sortOrder: 20,
    });
  });

  it('records an audit log after updating a category', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.update.mockResolvedValue({ ...categorySummary, name: '早餐', sortOrder: 20 });

    await service.updateCategory('user_1', 'category_1', { name: '早餐', sortOrder: 20 });

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'category',
        targetId: 'category_1',
        action: 'category.update',
        metadata: expect.objectContaining({
          name: '早餐',
          previousName: '餐饮',
          sortOrder: 20,
          previousSortOrder: 10,
        }),
      }),
    );
  });

  it('rejects update when the category is missing or archived', async () => {
    repository.findActiveById.mockResolvedValue(null);

    await expect(service.updateCategory('user_1', 'category_1', { name: '不存在' })).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(policy.canManageLedger).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects update when no active row is affected', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.update.mockResolvedValue(null);

    await expect(service.updateCategory('user_1', 'category_1', { name: '餐饮备用' })).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
  });

  it('does not delete system categories', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue({ ...categorySummary, isSystem: true });

    await expect(service.deleteCategory('user_1', 'category_1')).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.hasActiveChildren).not.toHaveBeenCalled();
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('does not delete a category with active children', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.hasActiveChildren.mockResolvedValue(true);

    await expect(service.deleteCategory('user_1', 'category_1')).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.hasActiveChildren).toHaveBeenCalledWith('category_1');
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('rejects delete when the category is missing or archived', async () => {
    repository.findActiveById.mockResolvedValue(null);

    await expect(service.deleteCategory('user_1', 'category_1')).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(policy.canManageLedger).not.toHaveBeenCalled();
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('requires ledger management before deleting a category', async () => {
    policy.canManageLedger.mockResolvedValue(false);
    repository.findActiveById.mockResolvedValue(categorySummary);

    await expect(service.deleteCategory('user_1', 'category_1')).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.hasActiveChildren).not.toHaveBeenCalled();
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('rejects delete as validation when the category is not visible to the user', async () => {
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.findActiveForUser.mockResolvedValue(null);

    await expect(service.deleteCategory('user_1', 'category_1')).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
    expect(repository.findActiveForUser).toHaveBeenCalledWith('user_1', 'category_1');
    expect(policy.canManageLedger).not.toHaveBeenCalled();
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('still returns member role denied when a visible category user cannot delete in the ledger', async () => {
    policy.canManageLedger.mockResolvedValue(false);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.findActiveForUser.mockResolvedValue(categorySummary);

    await expect(service.deleteCategory('user_1', 'category_1')).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { success: false, error: { code: 'MEMBER_ROLE_DENIED' } },
    });
    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.hasActiveChildren).not.toHaveBeenCalled();
    expect(repository.archive).not.toHaveBeenCalled();
  });

  it('rejects delete when no active row is affected', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.hasActiveChildren.mockResolvedValue(false);
    repository.archive.mockResolvedValue(null);

    await expect(service.deleteCategory('user_1', 'category_1')).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
  });

  it('archives a category instead of removing it', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.hasActiveChildren.mockResolvedValue(false);
    repository.archive.mockResolvedValue({ archived: true });

    await expect(service.deleteCategory('user_1', 'category_1')).resolves.toEqual({ archived: true });

    expect(policy.canManageLedger).toHaveBeenCalledWith('user_1', 'ledger_1');
    expect(repository.archive).toHaveBeenCalledWith('category_1');
  });

  it('records an audit log after archiving a category', async () => {
    policy.canManageLedger.mockResolvedValue(true);
    repository.findActiveById.mockResolvedValue(categorySummary);
    repository.hasActiveChildren.mockResolvedValue(false);
    repository.archive.mockResolvedValue({ archived: true });

    await service.deleteCategory('user_1', 'category_1');

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user_1',
        ledgerId: 'ledger_1',
        targetType: 'category',
        targetId: 'category_1',
        action: 'category.archive',
        metadata: expect.objectContaining({
          type: 'expense',
          name: '餐饮',
        }),
      }),
    );
  });
});
