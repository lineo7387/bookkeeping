import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { LedgerSummary } from '@bookkeeping/shared-types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { fail } from '../common/api-response';
import { LedgerPolicyService } from '../policies/ledger-policy.service';
import type { CreateLedgerDto } from './dto/create-ledger.dto';
import type { UpdateLedgerDto } from './dto/update-ledger.dto';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { LedgersRepository, type LedgerMemberSummary } from './ledgers.repository';

@Injectable()
export class LedgersService {
  constructor(
    private readonly ledgersRepository: LedgersRepository,
    private readonly ledgerPolicyService: LedgerPolicyService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createLedger(userId: string, dto: CreateLedgerDto): Promise<LedgerSummary> {
    const ledger = await this.ledgersRepository.createWithOwner(userId, dto);
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId: ledger.id,
      targetType: 'ledger',
      targetId: ledger.id,
      action: 'ledger.create',
      summary: 'Created ledger',
      metadata: ledgerAuditMetadata(ledger),
    });
    return ledger;
  }

  listLedgers(userId: string): Promise<LedgerSummary[]> {
    return this.ledgersRepository.findLedgersForUser(userId);
  }

  async getLedger(userId: string, ledgerId: string): Promise<LedgerSummary> {
    await this.requireView(userId, ledgerId);
    const ledger = await this.ledgersRepository.findLedgerForUser(userId, ledgerId);
    if (!ledger) {
      throw ledgerNotFound();
    }
    return ledger;
  }

  async updateLedger(userId: string, ledgerId: string, dto: UpdateLedgerDto): Promise<LedgerSummary> {
    await this.requireManage(userId, ledgerId);
    const ledger = await this.ledgersRepository.updateLedger(userId, ledgerId, dto);
    if (!ledger) {
      throw ledgerNotFound();
    }
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId,
      targetType: 'ledger',
      targetId: ledgerId,
      action: 'ledger.update',
      summary: 'Updated ledger',
      metadata: ledgerAuditMetadata(ledger),
    });
    return ledger;
  }

  async archiveLedger(userId: string, ledgerId: string): Promise<{ archived: true }> {
    await this.requireManage(userId, ledgerId);
    const member = await this.ledgersRepository.findMemberByUser(ledgerId, userId);
    if (member?.role !== 'owner') {
      throw roleDenied();
    }
    const archived = await this.ledgersRepository.archiveLedger(ledgerId);
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId,
      targetType: 'ledger',
      targetId: ledgerId,
      action: 'ledger.archive',
      summary: 'Archived ledger',
      metadata: { ownerMemberId: member.id },
    });
    return archived;
  }

  async listMembers(userId: string, ledgerId: string): Promise<LedgerMemberSummary[]> {
    await this.requireManage(userId, ledgerId);
    return this.ledgersRepository.listMembers(ledgerId);
  }

  async updateMemberRole(
    userId: string,
    ledgerId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<LedgerMemberSummary> {
    await this.requireManage(userId, ledgerId);
    const member = await this.ledgersRepository.findMember(memberId);
    if (!member) {
      throw ledgerNotFound();
    }
    if (member.role === 'owner') {
      throw roleDenied();
    }
    const updated = await this.ledgersRepository.updateMemberRole(memberId, dto.role);
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId,
      targetType: 'ledger_member',
      targetId: memberId,
      action: 'member.role.update',
      summary: 'Updated member role',
      metadata: {
        userId: updated.userId,
        previousRole: member.role,
        role: updated.role,
      },
    });
    return updated;
  }

  async removeMember(userId: string, ledgerId: string, memberId: string): Promise<LedgerMemberSummary> {
    await this.requireManage(userId, ledgerId);
    const member = await this.ledgersRepository.findMember(memberId);
    if (!member) {
      throw ledgerNotFound();
    }
    if (member.role === 'owner') {
      throw roleDenied();
    }
    const removed = await this.ledgersRepository.removeMember(memberId);
    await this.auditLogsService.record({
      actorUserId: userId,
      ledgerId,
      targetType: 'ledger_member',
      targetId: memberId,
      action: 'member.remove',
      summary: 'Removed member',
      metadata: {
        userId: removed.userId,
        previousRole: member.role,
        status: removed.status,
      },
    });
    return removed;
  }

  private async requireView(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canViewLedger(userId, ledgerId);
    if (!allowed) {
      throw new ForbiddenException(fail('LEDGER_ACCESS_DENIED', 'Ledger access denied'));
    }
  }

  private async requireManage(userId: string, ledgerId: string): Promise<void> {
    const allowed = await this.ledgerPolicyService.canManageLedger(userId, ledgerId);
    if (!allowed) {
      throw roleDenied();
    }
  }
}

function roleDenied(): ForbiddenException {
  return new ForbiddenException(fail('MEMBER_ROLE_DENIED', 'Member role denied'));
}

function ledgerNotFound(): NotFoundException {
  return new NotFoundException(fail('LEDGER_NOT_FOUND', 'Ledger not found'));
}

function ledgerAuditMetadata(ledger: LedgerSummary): Record<string, unknown> {
  return {
    name: ledger.name,
    type: ledger.type,
    defaultCurrency: ledger.defaultCurrency,
    timezone: ledger.timezone,
  };
}
