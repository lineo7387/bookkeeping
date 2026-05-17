import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  it('wraps register result and forwards request metadata', async () => {
    const authService = {
      register: jest.fn().mockResolvedValue({
        user: { id: 'user_1', email: 'lineo@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    } as unknown as jest.Mocked<AuthService>;
    const controller = new AuthController(authService);

    const result = await controller.register(
      { email: 'lineo@example.com', password: 'StrongPass123', nickname: 'Lineo' },
      {
        headers: { 'user-agent': 'Codex Browser' },
        ip: '127.0.0.1',
      },
    );

    expect(result).toEqual({
      success: true,
      data: {
        user: { id: 'user_1', email: 'lineo@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    expect(authService.register).toHaveBeenCalledWith({
      email: 'lineo@example.com',
      password: 'StrongPass123',
      nickname: 'Lineo',
      userAgent: 'Codex Browser',
      ipAddress: '127.0.0.1',
    });
  });
});
