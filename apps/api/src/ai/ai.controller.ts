import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ConfirmAiExtractionDto } from './dto/confirm-ai-extraction.dto';
import { ListAiTasksQueryDto } from './dto/list-ai-tasks-query.dto';
import { ParseAiTextDto } from './dto/parse-ai-text.dto';
import { RejectAiExtractionDto } from './dto/reject-ai-extraction.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ledgers/:ledgerId/ai/text-parse')
  async parseText(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: ParseAiTextDto,
  ) {
    return ok(await this.aiService.parseAiText(user.id, ledgerId, dto));
  }

  @Get('ledgers/:ledgerId/ai/tasks')
  async listTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @Query() query: ListAiTasksQueryDto,
  ) {
    return ok(await this.aiService.listLedgerTasks(user.id, ledgerId, query));
  }

  @Get('ai/tasks/:taskId')
  async getTask(@CurrentUser() user: AuthenticatedUser, @Param('taskId') taskId: string) {
    return ok(await this.aiService.getTask(user.id, taskId));
  }

  @Post('ai/extractions/:extractionId/confirm')
  async confirmExtraction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('extractionId') extractionId: string,
    @Body() dto: ConfirmAiExtractionDto,
  ) {
    return ok(await this.aiService.confirmExtraction(user.id, extractionId, dto));
  }

  @Post('ai/extractions/:extractionId/reject')
  async rejectExtraction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('extractionId') extractionId: string,
    @Body() dto: RejectAiExtractionDto,
  ) {
    return ok(await this.aiService.rejectExtraction(user.id, extractionId, dto));
  }
}
