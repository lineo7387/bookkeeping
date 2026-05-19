import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { SystemAdminGuard } from './system-admin.guard';

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [AdminRepository, AdminService, SystemAdminGuard],
})
export class AdminModule {}
