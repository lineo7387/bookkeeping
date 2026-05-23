import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from './dto/receipt-ocr-file.filter';
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

  @Post('ledgers/:ledgerId/ai/receipt-ocr')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  async receiptOcr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('ledgerId') ledgerId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      const { fail: failFn } = await import('../common/api-response');
      throw new (await import('@nestjs/common')).BadRequestException(failFn('VALIDATION_FAILED', '请上传票据图片'));
    }
    return ok(await this.aiService.submitReceiptOcr(user.id, ledgerId, file));
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
