import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { ListAdminQueryDto } from './dto/list-admin-query.dto';
import { SystemAdminGuard } from './system-admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers(@Query() query: ListAdminQueryDto) {
    return ok(await this.adminService.listUsers(query));
  }

  @Get('ledgers')
  async listLedgers(@Query() query: ListAdminQueryDto) {
    return ok(await this.adminService.listLedgers(query));
  }

  @Get('ai/tasks')
  async listAiTasks(@Query() query: ListAdminQueryDto) {
    return ok(await this.adminService.listAiTasks(query));
  }

  @Get('audit-logs')
  async listAuditLogs(@Query() query: ListAdminQueryDto) {
    return ok(await this.adminService.listAuditLogs(query));
  }
}
