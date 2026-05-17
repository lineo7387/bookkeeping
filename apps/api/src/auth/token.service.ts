import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

export interface TokenUser {
  id: string;
  email: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  sid: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(user: TokenUser): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as JwtSignOptions['expiresIn'],
      },
    );
  }

  createRefreshToken(user: TokenUser, sessionId: string): string {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, sid: sessionId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '30d',
        ) as JwtSignOptions['expiresIn'],
      },
    );
  }

  verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    });
  }
}
