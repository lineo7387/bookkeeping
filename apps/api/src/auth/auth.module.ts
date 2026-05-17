import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthSessionsRepository, AuthService, JwtStrategy, TokenService],
  exports: [AuthService],
})
export class AuthModule {}
