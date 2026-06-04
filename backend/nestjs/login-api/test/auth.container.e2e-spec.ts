import {
  HttpException,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AUTH_MESSAGES } from '../src/auth/auth.constants';

const VALID_PASSWORD = 'validPassword';

const SCHEMA_SQL = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  failed_login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMP
);
`;

describe('Login API (Testcontainers + Postgres e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;
  let app: INestApplication;

  beforeAll(async () => {
    // 1. Spin up a real PostgreSQL instance.
    container = await new PostgreSqlContainer('postgres:latest').start();

    // 2. Point the application config at the container.
    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = String(container.getPort());
    process.env.DB_USER = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();
    process.env.DB_NAME = container.getDatabase();
    process.env.JWT_SECRET = 'test-secret';

    // 3. Create the schema directly against the container.
    client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    await client.query(SCHEMA_SQL);

    // 4. Boot the real application module (TypeORM connects to the container).
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await client?.end();
    await container?.stop();
  });

  beforeEach(async () => {
    // Reset to a known state before each test.
    const hash = bcrypt.hashSync(VALID_PASSWORD, 10);
    await client.query('TRUNCATE TABLE users RESTART IDENTITY');
    await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      ['user1', hash],
    );
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

  // TC002 - unknown user
  it('POST /api/login returns 401 for an unknown username', async () => {
    await request(app.getHttpServer())
      .post('/api/login')
      .send({ username: 'ghost', password: VALID_PASSWORD })
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

    // Even the correct password is rejected while locked.
    await request(server)
      .post('/api/login')
      .send({ username: 'user1', password: VALID_PASSWORD })
      .expect(401)
      .expect({ error: AUTH_MESSAGES.accountLocked });

    // The lock state is persisted in the database.
    const { rows } = await client.query(
      'SELECT failed_login_attempts, account_locked_until FROM users WHERE username = $1',
      ['user1'],
    );
    expect(rows[0].failed_login_attempts).toBe(3);
    expect(rows[0].account_locked_until).not.toBeNull();
  });
});
