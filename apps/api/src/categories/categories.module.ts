import { Module } from '@nestjs/common';
import { PoliciesModule } from '../policies/policies.module';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';

@Module({
  imports: [PoliciesModule],
  controllers: [CategoriesController],
  providers: [CategoriesRepository, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
