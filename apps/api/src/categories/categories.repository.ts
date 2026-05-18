import { Injectable } from '@nestjs/common';
import type { CategorySummary, CategoryType } from '@bookkeeping/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryRecord = {
  id: string;
  ledgerId: string;
  parentId: string | null;
  type: CategoryType;
  name: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveByLedger(ledgerId: string, type?: CategoryType): Promise<CategorySummary[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        ledgerId,
        type,
        archivedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return categories.map(toCategorySummary);
  }

  async create(ledgerId: string, dto: CreateCategoryDto): Promise<CategorySummary> {
    const category = await this.prisma.category.create({
      data: {
        ledgerId,
        parentId: dto.parentId,
        type: dto.type,
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return toCategorySummary(category);
  }

  async findActiveById(categoryId: string): Promise<CategorySummary | null> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        archivedAt: null,
      },
    });

    return category ? toCategorySummary(category) : null;
  }

  async update(categoryId: string, dto: UpdateCategoryDto): Promise<CategorySummary> {
    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });

    return toCategorySummary(category);
  }

  async hasActiveChildren(categoryId: string): Promise<boolean> {
    const child = await this.prisma.category.findFirst({
      where: {
        parentId: categoryId,
        archivedAt: null,
      },
      select: { id: true },
    });

    return child !== null;
  }

  async archive(categoryId: string): Promise<{ archived: true }> {
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { archivedAt: new Date() },
    });

    return { archived: true };
  }
}

function toCategorySummary(category: CategoryRecord): CategorySummary {
  return {
    id: category.id,
    ledgerId: category.ledgerId,
    parentId: category.parentId,
    type: category.type,
    name: category.name,
    icon: category.icon,
    color: category.color,
    isSystem: category.isSystem,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
