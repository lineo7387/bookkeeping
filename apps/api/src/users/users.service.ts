import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

export interface PublicUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      return null;
    }

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
}
