import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AUTH_MESSAGES } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { USER_REPOSITORY } from '../user/user.repository';
import type { IUserRepository } from '../user/user.repository';

/** Maximum failed attempts before the account is temporarily locked. */
const MAX_FAILED_ATTEMPTS = 3;
/** How long an account stays locked after hitting the limit (15 minutes). */
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string }> {
    const username = (dto?.username ?? '').trim();
    const password = dto?.password ?? '';

    if (!username || !password) {
      throw new HttpException(
        { error: AUTH_MESSAGES.missingFields },
        HttpStatus.BAD_REQUEST,
      );
    }

    let user;
    try {
      user = await this.userRepository.findByUsername(username);
    } catch (err) {
      this.logger.error('Failed to fetch user', err as Error);
      throw new HttpException(
        { error: AUTH_MESSAGES.serverError },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!user) {
      throw new HttpException(
        { error: AUTH_MESSAGES.invalidCredentials },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const now = new Date();
    if (user.isLocked(now)) {
      throw new HttpException(
        { error: AUTH_MESSAGES.accountLocked },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (passwordMatches) {
      // Successful login: reset any failed-attempt state.
      if (user.failedLoginAttempts !== 0 || user.accountLockedUntil != null) {
        await this.persistLoginState(user.id, 0, null);
      }
      const token = await this.jwtService.signAsync({
        sub: user.id,
        username: user.username,
      });
      return { token };
    }

    // Failed login: increment counter and lock when threshold is reached.
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = locked
      ? new Date(now.getTime() + LOCK_DURATION_MS)
      : null;

    await this.persistLoginState(user.id, attempts, lockedUntil);

    throw new HttpException(
      {
        error: locked
          ? AUTH_MESSAGES.accountLocked
          : AUTH_MESSAGES.invalidCredentials,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  private async persistLoginState(
    id: number,
    attempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    try {
      await this.userRepository.updateLoginState(id, attempts, lockedUntil);
    } catch (err) {
      this.logger.error('Failed to update login state', err as Error);
      throw new HttpException(
        { error: AUTH_MESSAGES.serverError },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
