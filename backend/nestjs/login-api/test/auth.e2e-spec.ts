import { HttpException, HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { AUTH_MESSAGES } from '../src/auth/auth.constants';
import { User } from '../src/user/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../src/user/user.repository';

const VALID_PASSWORD = 'validPassword';

/** Simple in-memory repository so e2e tests run without a live database. */
class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.username, user);
  }

  findByUsername(username: string): Promise<User | null> {
    return Promise.resolve(this.users.get(username) ?? null);
  }

  updateLoginState(
    id: number,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    for (const user of this.users.values()) {
      if (user.id === id) {
        user.failedLoginAttempts = failedAttempts;
        user.accountLockedUntil = lockedUntil;
      }
    }
    return Promise.resolve();
  }
}

function buildUser(): User {
  const user = new User();
  user.id = 1;
  user.username = 'user1';
  user.passwordHash = bcrypt.hashSync(VALID_PASSWORD, 10);
  user.failedLoginAttempts = 0;
  user.accountLockedUntil = null;
  return user;
}

describe('Login API (e2e)', () => {
  let app: INestApplication;
  let repo: InMemoryUserRepository;

  beforeEach(async () => {
    repo = new InMemoryUserRepository();
    repo.seed(buildUser());

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [AuthController],
      providers: [AuthService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: () =>
          new HttpException(
            { error: AUTH_MESSAGES.missingFields },
            HttpStatus.BAD_REQUEST,
          ),
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // TC001
  it('POST /api/login returns 200 and a token for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/login')
      .send({ username: 'user1', password: VALID_PASSWORD })
      .expect(200);

    expect(res.body.token).toEqual(expect.any(String));
  });

  // TC002
  it('POST /api/login returns 401 for invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/login')
      .send({ username: 'user1', password: 'wrong' })
      .expect(401)
      .expect({ error: AUTH_MESSAGES.invalidCredentials });
  });

  // TC003
  it('POST /api/login returns 400 when fields are missing', async () => {
    await request(app.getHttpServer())
      .post('/api/login')
      .send({ username: 'user1' })
      .expect(400)
      .expect({ error: AUTH_MESSAGES.missingFields });
  });

  // TC005
  it('POST /api/login locks the account after 3 failed attempts', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/api/login')
      .send({ username: 'user1', password: 'wrong' })
      .expect(401)
      .expect({ error: AUTH_MESSAGES.invalidCredentials });

    await request(server)
      .post('/api/login')
      .send({ username: 'user1', password: 'wrong' })
      .expect(401)
      .expect({ error: AUTH_MESSAGES.invalidCredentials });

    // 3rd failed attempt locks the account.
    await request(server)
      .post('/api/login')
      .send({ username: 'user1', password: 'wrong' })
      .expect(401)
      .expect({ error: AUTH_MESSAGES.accountLocked });

    // Even a correct password is rejected while locked.
    await request(server)
      .post('/api/login')
      .send({ username: 'user1', password: VALID_PASSWORD })
      .expect(401)
      .expect({ error: AUTH_MESSAGES.accountLocked });
  });
});
