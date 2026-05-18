import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('ledgers/:ledgerId/categories')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Query() query: ListCategoriesQueryDto,
  ) {
    return ok(await this.categoriesService.listCategories(user.id, ledgerId, query));
  }

  @Post('ledgers/:ledgerId/categories')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return ok(await this.categoriesService.createCategory(user.id, ledgerId, dto));
  }

  @Patch('categories/:categoryId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return ok(await this.categoriesService.updateCategory(user.id, categoryId, dto));
  }

  @Delete('categories/:categoryId')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('categoryId') categoryId: string) {
    return ok(await this.categoriesService.deleteCategory(user.id, categoryId));
  }
}
