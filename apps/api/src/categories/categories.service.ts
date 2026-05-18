import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { CategorySummary } from '@bookkeeping/shared-types';
import { fail } from '../common/api-response';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import { CategoriesRepository } from './categories.repository';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
  ) {}

  async listCategories(
    userId: string,
    ledgerId: string,
    query: ListCategoriesQueryDto = {},
  ): Promise<CategorySummary[]> {
    await this.requireViewLedger(userId, ledgerId);
    return this.categoriesRepository.listActiveByLedger(ledgerId, query.type);
  }

  async createCategory(userId: string, ledgerId: string, dto: CreateCategoryDto): Promise<CategorySummary> {
    await this.requireManageLedger(userId, ledgerId);
    if (dto.parentId) {
      await this.validateParent(dto.parentId, ledgerId, dto.type);
    }

    return this.categoriesRepository.create(ledgerId, dto);
  }

  async updateCategory(userId: string, categoryId: string, dto: UpdateCategoryDto): Promise<CategorySummary> {
    const category = await this.getActiveCategory(categoryId);
    await this.requireManageLedger(userId, category.ledgerId);

    if (dto.parentId) {
      if (dto.parentId === categoryId) {
        throw validationFailed('Category cannot use itself as parent');
      }
      await this.validateParent(dto.parentId, category.ledgerId, category.type);
    }

    const updated = await this.categoriesRepository.update(categoryId, dto);
    if (!updated) {
      throw validationFailed('Category not found');
    }

    return updated;
  }

  async deleteCategory(userId: string, categoryId: string): Promise<{ archived: true }> {
    const category = await this.getActiveCategory(categoryId);
    await this.requireManageLedger(userId, category.ledgerId);

    if (category.isSystem) {
      throw validationFailed('System category cannot be deleted');
    }

    const hasActiveChildren = await this.categoriesRepository.hasActiveChildren(categoryId);
    if (hasActiveChildren) {
      throw validationFailed('Category with active children cannot be deleted');
    }

    const archived = await this.categoriesRepository.archive(categoryId);
    if (!archived) {
      throw validationFailed('Category not found');
    }

    return archived;
  }

  private async getActiveCategory(categoryId: string): Promise<CategorySummary> {
    const category = await this.categoriesRepository.findActiveById(categoryId);
    if (!category) {
      throw validationFailed('Category not found');
    }
    return category;
  }

  private async validateParent(parentId: string, ledgerId: string, type: CategorySummary['type']): Promise<void> {
    const parent = await this.categoriesRepository.findActiveById(parentId);
    if (!parent || parent.ledgerId !== ledgerId || parent.type !== type) {
      throw validationFailed('Parent category is invalid');
    }
  }

  private async requireViewLedger(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewLedger(userId, ledgerId);
    if (!allowed) {
      throw new ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'));
    }
  }

  private async requireManageLedger(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canManageLedger(userId, ledgerId);
    if (!allowed) {
      throw roleDenied();
    }
  }
}

function roleDenied(): ForbiddenException {
  return new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'Member role denied'));
}

function validationFailed(message: string): BadRequestException {
  return new BadRequestException(fail('VALIDATION_FAILED', message));
}
