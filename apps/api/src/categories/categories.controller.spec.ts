import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let categoriesService: jest.Mocked<
    Pick<CategoriesService, 'listCategories' | 'createCategory' | 'updateCategory' | 'deleteCategory'>
  >;
  let controller: CategoriesController;

  beforeEach(() => {
    categoriesService = {
      listCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    };
    controller = new CategoriesController(categoriesService as unknown as CategoriesService);
  });

  it('wraps GET /ledgers/:ledgerId/categories results', async () => {
    categoriesService.listCategories.mockResolvedValue([
      {
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
      },
    ]);

    await expect(
      controller.list({ id: 'user_1', email: 'lineo@example.com' }, 'ledger_1', { type: 'expense' }),
    ).resolves.toMatchObject({
      success: true,
      data: [{ id: 'category_1', ledgerId: 'ledger_1', type: 'expense' }],
    });
    expect(categoriesService.listCategories).toHaveBeenCalledWith('user_1', 'ledger_1', { type: 'expense' });
  });

  it('wraps POST /ledgers/:ledgerId/categories result', async () => {
    categoriesService.createCategory.mockResolvedValue({
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
    });

    await expect(
      controller.create(
        { id: 'user_1', email: 'lineo@example.com' },
        'ledger_1',
        { type: 'expense', name: '餐饮', icon: 'utensils', color: '#F59E0B' },
      ),
    ).resolves.toMatchObject({
      success: true,
      data: { id: 'category_1', type: 'expense', name: '餐饮' },
    });
    expect(categoriesService.createCategory).toHaveBeenCalledWith('user_1', 'ledger_1', {
      type: 'expense',
      name: '餐饮',
      icon: 'utensils',
      color: '#F59E0B',
    });
  });

  it('wraps PATCH /categories/:categoryId result', async () => {
    categoriesService.updateCategory.mockResolvedValue({
      id: 'category_1',
      ledgerId: 'ledger_1',
      parentId: null,
      type: 'expense',
      name: '餐饮备用',
      icon: 'utensils',
      color: '#F59E0B',
      isSystem: false,
      sortOrder: 10,
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    });

    await expect(
      controller.update({ id: 'user_1', email: 'lineo@example.com' }, 'category_1', { name: '餐饮备用' }),
    ).resolves.toMatchObject({
      success: true,
      data: { id: 'category_1', name: '餐饮备用' },
    });
    expect(categoriesService.updateCategory).toHaveBeenCalledWith('user_1', 'category_1', {
      name: '餐饮备用',
    });
  });

  it('wraps DELETE /categories/:categoryId result', async () => {
    categoriesService.deleteCategory.mockResolvedValue({ archived: true });

    await expect(controller.remove({ id: 'user_1', email: 'lineo@example.com' }, 'category_1')).resolves.toEqual({
      success: true,
      data: { archived: true },
    });
    expect(categoriesService.deleteCategory).toHaveBeenCalledWith('user_1', 'category_1');
  });
});
