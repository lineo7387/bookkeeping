import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { TokenService } from './token.service';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'create' | 'findByEmail' | 'findById'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findPublicById'>>;
  let sessionsRepository: jest.Mocked<
    Pick<AuthSessionsRepository, 'create' | 'findActiveById' | 'updateRefreshTokenHash' | 'revoke'>
  >;
  let tokenService: jest.Mocked<
    Pick<TokenService, 'createAccessToken' | 'createRefreshToken' | 'verifyRefreshToken'>
  >;

  const now = new Date('2026-05-17T12:00:00.000Z');
  const existingUser = {
    id: 'user_1',
    email: 'lineo@example.com',
    phone: null,
    passwordHash: '',
    nickname: 'Lineo',
    avatarUrl: null,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    usersRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    usersService = {
      findPublicById: jest.fn(),
    };
    sessionsRepository = {
      create: jest.fn(),
      findActiveById: jest.fn(),
      updateRefreshTokenHash: jest.fn(),
      revoke: jest.fn(),
    };
    tokenService = {
      createAccessToken: jest.fn().mockReturnValue('access-token'),
      createRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      verifyRefreshToken: jest.fn().mockReturnValue({ sub: 'user_1', sid: 'session_1' }),
    };

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      usersService as unknown as UsersService,
      sessionsRepository as unknown as AuthSessionsRepository,
      tokenService as unknown as TokenService,
    );
  });

  it('registers a user with lowercase email and creates a refresh session', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation(async (input) => ({
      ...existingUser,
      email: input.email,
      passwordHash: input.passwordHash,
      nickname: input.nickname,
    }));

    const result = await service.register({
      email: 'LINEO@EXAMPLE.COM',
      password: 'StrongPass123',
      nickname: 'Lineo',
      userAgent: 'Vitest Browser',
      ipAddress: '127.0.0.1',
    });

    expect(result.user.email).toBe('lineo@example.com');
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'lineo@example.com',
      passwordHash: expect.stringContaining('$argon2') as string,
      nickname: 'Lineo',
    });
    expect(sessionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String) as string,
        userId: 'user_1',
        refreshTokenHash: expect.stringContaining('$argon2') as string,
        userAgent: 'Vitest Browser',
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('rejects duplicate registration email', async () => {
    usersRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(
      service.register({
        email: 'lineo@example.com',
        password: 'StrongPass123',
        nickname: 'Lineo',
      }),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      response: { success: false, error: { code: 'VALIDATION_FAILED' } },
    });
  });

  it('logs in with valid password and rejects invalid password', async () => {
    const passwordHash = await argon2.hash('StrongPass123');
    usersRepository.findByEmail.mockResolvedValue({ ...existingUser, passwordHash });

    await expect(
      service.login({ email: 'lineo@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      constructor: UnauthorizedException,
      response: { success: false, error: { code: 'AUTH_REQUIRED' } },
    });

    const result = await service.login({
      email: 'lineo@example.com',
      password: 'StrongPass123',
      userAgent: 'Vitest Browser',
      ipAddress: '127.0.0.1',
    });

    expect(result.accessToken).toBe('access-token');
    expect(sessionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_1', userAgent: 'Vitest Browser' }),
    );
  });

  it('refreshes tokens only for an active non-revoked session', async () => {
    const refreshTokenHash = await argon2.hash('refresh-token');
    sessionsRepository.findActiveById.mockResolvedValue({
      id: 'session_1',
      userId: 'user_1',
      refreshTokenHash,
      userAgent: null,
      ipAddress: null,
      expiresAt: new Date('2026-06-17T12:00:00.000Z'),
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    usersRepository.findById.mockResolvedValue(existingUser);

    const result = await service.refresh({ refreshToken: 'refresh-token' });

    expect(result.accessToken).toBe('access-token');
    expect(sessionsRepository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'session_1',
      expect.stringContaining('$argon2') as string,
      expect.any(Date) as Date,
    );

    sessionsRepository.findActiveById.mockResolvedValue(null);
    await expect(service.refresh({ refreshToken: 'refresh-token' })).rejects.toMatchObject({
      constructor: UnauthorizedException,
      response: { success: false, error: { code: 'TOKEN_EXPIRED' } },
    });
  });
});
