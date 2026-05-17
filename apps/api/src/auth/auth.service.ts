import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { fail } from '../common/api-response';
import type { PublicUser } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { TokenService } from './token.service';

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly sessionsRepository: AuthSessionsRepository,
    private readonly tokenService: TokenService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException(fail('VALIDATION_FAILED', 'Email is already registered'));
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.usersRepository.create({
      email,
      passwordHash,
      nickname: input.nickname,
    });

    return this.issueSession(user, input.userAgent, input.ipAddress);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.usersRepository.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw invalidCredentials();
    }

    const isValidPassword = await argon2.verify(user.passwordHash, input.password);
    if (!isValidPassword) {
      throw invalidCredentials();
    }

    return this.issueSession(user, input.userAgent, input.ipAddress);
  }

  async refresh(input: RefreshInput): Promise<AuthResult> {
    const payload = this.verifyRefreshPayload(input.refreshToken);
    const session = await this.sessionsRepository.findActiveById(payload.sid, payload.sub);
    if (!session) {
      throw invalidRefreshToken();
    }

    const isValidRefreshToken = await argon2.verify(session.refreshTokenHash, input.refreshToken);
    if (!isValidRefreshToken) {
      throw invalidRefreshToken();
    }

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw invalidRefreshToken();
    }

    const refreshToken = this.tokenService.createRefreshToken(user, session.id);
    await this.sessionsRepository.updateRefreshTokenHash(
      session.id,
      await argon2.hash(refreshToken),
      refreshTokenExpiresAt(),
    );

    return {
      user: toPublicUser(user),
      accessToken: this.tokenService.createAccessToken(user),
      refreshToken,
    };
  }

  async logout(input: LogoutInput): Promise<{ revoked: true }> {
    const payload = this.verifyRefreshPayload(input.refreshToken);
    const session = await this.sessionsRepository.findActiveById(payload.sid, payload.sub);
    if (!session) {
      throw invalidRefreshToken();
    }

    const isValidRefreshToken = await argon2.verify(session.refreshTokenHash, input.refreshToken);
    if (!isValidRefreshToken) {
      throw invalidRefreshToken();
    }

    await this.sessionsRepository.revoke(session.id);
    return { revoked: true };
  }

  validateUser(userId: string): Promise<PublicUser | null> {
    return this.usersService.findPublicById(userId);
  }

  private async issueSession(
    user: {
      id: string;
      email: string;
      nickname: string;
      avatarUrl: string | null;
      status: 'active' | 'disabled';
      createdAt: Date;
      updatedAt: Date;
    },
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<AuthResult> {
    if (user.status !== 'active') {
      throw invalidCredentials();
    }

    const sessionId = randomUUID();
    const accessToken = this.tokenService.createAccessToken(user);
    const refreshToken = this.tokenService.createRefreshToken(user, sessionId);

    await this.sessionsRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: await argon2.hash(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: refreshTokenExpiresAt(),
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  }

  private verifyRefreshPayload(refreshToken: string): { sub: string; sid: string } {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      if (!payload.sub || !payload.sid) {
        throw invalidRefreshToken();
      }

      return payload;
    } catch {
      throw invalidRefreshToken();
    }
  }
}

function toPublicUser(user: {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function refreshTokenExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
}

function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException(fail('AUTH_REQUIRED', 'Invalid credentials'));
}

function invalidRefreshToken(): UnauthorizedException {
  return new UnauthorizedException(fail('TOKEN_EXPIRED', 'Refresh token is invalid or expired'));
}
