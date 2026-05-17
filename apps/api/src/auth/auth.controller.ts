import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, type AuthenticatedUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

interface RequestMetadata {
  headers: {
    'user-agent'?: string;
  };
  ip?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() request: RequestMetadata) {
    return ok(
      await this.authService.register({
        ...dto,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      }),
    );
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: RequestMetadata) {
    return ok(
      await this.authService.login({
        ...dto,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      }),
    );
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return ok(await this.authService.refresh(dto));
  }

  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    return ok(await this.authService.logout(dto));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.authService.validateUser(user.id));
  }
}
