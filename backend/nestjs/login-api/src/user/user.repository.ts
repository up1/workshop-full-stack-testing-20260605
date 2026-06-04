import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

/** Token used to inject a UserRepository, enabling easy mocking in tests. */
export const USER_REPOSITORY = 'USER_REPOSITORY';

/**
 * Abstraction over user persistence so the auth service depends on an
 * interface rather than TypeORM directly (mirrors the Go implementation).
 */
export interface IUserRepository {
  findByUsername(username: string): Promise<User | null>;
  updateLoginState(
    id: number,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void>;
}

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username } });
  }

  async updateLoginState(
    id: number,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await this.repo.update(id, {
      failedLoginAttempts: failedAttempts,
      accountLockedUntil: lockedUntil,
    });
  }
}
