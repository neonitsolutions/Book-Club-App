import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { configureApp } from './../src/app.setup';
import { MailMessage, MailService } from './../src/mail/mail.service';
import { User } from './../src/users/user.schema';
import { REDIS_CLIENT } from './../src/redis/redis.module';

/** The same flows with REQUIRE_EMAIL_VERIFICATION=false (SES not available). */
describe('Auth without email verification (e2e)', () => {
  let app: NestExpressApplication;
  let mongo: MongoMemoryServer;
  let users: Model<User>;
  const outbox: MailMessage[] = [];

  const ada = {
    name: 'Ada Reader',
    email: 'ada@example.com',
    password: 'correct horse battery',
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.MONGODB_URI = mongo.getUri();
    process.env.REDIS_URL = 'redis://unused:6379';
    process.env.JWT_ACCESS_SECRET =
      'test-secret-that-is-at-least-32-characters';
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';

    const { AppModule } = await import('./../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({ ping: jest.fn(), quit: jest.fn() })
      .overrideProvider(MailService)
      .useValue({
        send: (message: MailMessage) => {
          outbox.push(message);
          return Promise.resolve();
        },
      })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    users = moduleFixture.get(getModelToken(User.name));
    await users.syncIndexes();
  }, 120_000);

  afterAll(async () => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
    await app?.close();
    await mongo?.stop();
  });

  const http = () => request(app.getHttpServer());

  it('signs a new member in straight away and sends no email', async () => {
    const res = await http().post('/api/auth/register').send(ada).expect(201);

    expect(res.body).toMatchObject({
      verificationRequired: false,
      user: { email: 'ada@example.com', role: 'MEMBER', emailVerified: true },
    });
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
    expect(outbox).toHaveLength(0);

    // The cookie works for the session check
    const access = cookies.find((c) => c.startsWith('access_token='))!;
    await http()
      .get('/api/auth/me')
      .set('Cookie', access.split(';')[0])
      .expect(200);
  });

  it('lets the member sign in later with their password', async () => {
    await http()
      .post('/api/auth/login')
      .send({ email: ada.email, password: ada.password })
      .expect(200);
  });

  it('lets accounts left unactivated earlier sign in', async () => {
    await http()
      .post('/api/auth/register')
      .send({ ...ada, email: 'old@example.com' })
      .expect(201);
    // As if created while verification was still on
    await users.updateOne(
      { email: 'old@example.com' },
      { emailVerifiedAt: null },
    );

    await http()
      .post('/api/auth/login')
      .send({ email: 'old@example.com', password: ada.password })
      .expect(200);
  });

  it('sends nothing when asked to resend an activation link', async () => {
    await http()
      .post('/api/auth/resend-verification')
      .send({ email: 'old@example.com' })
      .expect(204);
    expect(outbox).toHaveLength(0);
  });

  it('still refuses a duplicate email', async () => {
    await http()
      .post('/api/auth/register')
      .send({ ...ada, email: 'ADA@example.com' })
      .expect(409);
  });
});
