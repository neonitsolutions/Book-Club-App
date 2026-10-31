import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { configureApp } from './../src/app.setup';
import { REDIS_CLIENT } from './../src/redis/redis.module';

type HealthBody = {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
};

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;
  let mongo: MongoMemoryServer;
  const redis = { ping: jest.fn(), quit: jest.fn() };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.MONGODB_URI = mongo.getUri();
    process.env.REDIS_URL = 'redis://unused:6379';
    process.env.JWT_ACCESS_SECRET =
      'test-secret-that-is-at-least-32-characters';

    // Imported here, not at the top: ConfigModule validates the environment
    // as soon as AppModule loads, so the variables above must be set first.
    const { AppModule } = await import('./../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  beforeEach(() => {
    redis.ping.mockResolvedValue('PONG');
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer()).get('/api').expect(200).expect({
      message: 'Readers Club API is running',
      version: '1.0.0',
      status: 'online',
    });
  });

  it('/api/health (GET) reports ok when MongoDB and Redis are up', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect((res.body as HealthBody).status).toBe('ok');
    expect((res.body as HealthBody).info).toMatchObject({
      mongodb: { status: 'up' },
      redis: { status: 'up' },
    });
  });

  it('/api/health (GET) returns 503 when Redis is down', async () => {
    redis.ping.mockRejectedValue(new Error('connection refused'));
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);
    expect((res.body as HealthBody).error).toMatchObject({
      redis: { status: 'down' },
    });
  });
});
