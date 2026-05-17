import { Injectable } from '@nestjs/common';
import type { UserSession } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuthSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}

@Injectable()
export class AuthSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAuthSessionInput): Promise<UserSession> {
    return this.prisma.userSession.create({
      data: {
        id: input.id,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: input.expiresAt,
      },
    });
  }

  findActiveById(id: string, userId: string): Promise<UserSession | null> {
    return this.prisma.userSession.findFirst({
      where: {
        id,
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  updateRefreshTokenHash(id: string, refreshTokenHash: string, expiresAt: Date): Promise<UserSession> {
    return this.prisma.userSession.update({
      where: { id },
      data: { refreshTokenHash, expiresAt },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
