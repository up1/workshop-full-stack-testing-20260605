import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AUTH_MESSAGES } from './auth.constants';
import { User } from '../user/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../user/user.repository';

const VALID_PASSWORD = 'validPassword';

function buildUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 1;
  user.username = 'user1';
  user.passwordHash = bcrypt.hashSync(VALID_PASSWORD, 10);
  user.failedLoginAttempts = 0;
  user.accountLockedUntil = null;
  return Object.assign(user, overrides);
}

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    repo = {
      findByUsername: jest.fn(),
      updateLoginState: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: repo },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('jwt-token') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // TC001
  it('returns a token for valid credentials', async () => {
    repo.findByUsername.mockResolvedValue(buildUser());

    const result = await service.login({
      username: 'user1',
      password: VALID_PASSWORD,
    });

    expect(result).toEqual({ token: 'jwt-token' });
  });

  it('resets failed attempts after a successful login', async () => {
    repo.findByUsername.mockResolvedValue(
      buildUser({ failedLoginAttempts: 2 }),
    );

    await service.login({ username: 'user1', password: VALID_PASSWORD });

    expect(repo.updateLoginState).toHaveBeenCalledWith(1, 0, null);
  });

  // TC002 - invalid password
  it('rejects an invalid password with 401', async () => {
    repo.findByUsername.mockResolvedValue(buildUser());

    await expect(
      service.login({ username: 'user1', password: 'wrong' }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: AUTH_MESSAGES.invalidCredentials },
    });
  });

  // TC002 - unknown user
  it('rejects an unknown username with 401', async () => {
    repo.findByUsername.mockResolvedValue(null);

    await expect(
      service.login({ username: 'ghost', password: 'whatever' }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: AUTH_MESSAGES.invalidCredentials },
    });
  });

  // TC003
  it.each([
    [{ username: 'user1', password: '' }],
    [{ username: '', password: 'pass' }],
    [{ username: '   ', password: 'pass' }],
  ])('returns 400 when fields are missing (%j)', async (dto) => {
    await expect(service.login(dto as never)).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: AUTH_MESSAGES.missingFields },
    });
  });

  // TC004
  it('returns 500 when the repository throws', async () => {
    repo.findByUsername.mockRejectedValue(new Error('db down'));

    await expect(
      service.login({ username: 'user1', password: VALID_PASSWORD }),
    ).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      response: { error: AUTH_MESSAGES.serverError },
    });
  });

  // TC005
  it('locks the account on the 3rd failed attempt', async () => {
    repo.findByUsername.mockResolvedValue(
      buildUser({ failedLoginAttempts: 2 }),
    );

    await expect(
      service.login({ username: 'user1', password: 'wrong' }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: AUTH_MESSAGES.accountLocked },
    });

    expect(repo.updateLoginState).toHaveBeenCalledWith(
      1,
      3,
      expect.any(Date),
    );
  });

  it('rejects a login while the account is locked', async () => {
    repo.findByUsername.mockResolvedValue(
      buildUser({
        failedLoginAttempts: 3,
        accountLockedUntil: new Date(Date.now() + 60_000),
      }),
    );

    await expect(
      service.login({ username: 'user1', password: VALID_PASSWORD }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: AUTH_MESSAGES.accountLocked },
    });
    expect(repo.updateLoginState).not.toHaveBeenCalled();
  });

  it('throws a generic 500 (not the bcrypt error) is avoided for valid flow', async () => {
    repo.findByUsername.mockResolvedValue(buildUser());
    repo.updateLoginState.mockResolvedValue(undefined);

    const result = await service.login({
      username: 'user1',
      password: VALID_PASSWORD,
    });
    expect(result.token).toBeDefined();
  });

  it('increments the counter on a non-locking failed attempt', async () => {
    repo.findByUsername.mockResolvedValue(
      buildUser({ failedLoginAttempts: 0 }),
    );

    await expect(
      service.login({ username: 'user1', password: 'wrong' }),
    ).rejects.toBeInstanceOf(HttpException);

    expect(repo.updateLoginState).toHaveBeenCalledWith(1, 1, null);
  });
});
