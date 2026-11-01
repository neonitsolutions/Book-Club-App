import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import * as request from 'supertest';
import { configureApp } from './../src/app.setup';
import { Session } from './../src/auth/session.schema';
import { User } from './../src/users/user.schema';
import { REDIS_CLIENT } from './../src/redis/redis.module';

type UserBody = {
  user: { id: string; name: string; email: string; role: string };
};

/** "name=value" pairs from Set-Cookie, for sending back as a Cookie header. */
function cookiesFrom(res: request.Response): Record<string, string> {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookies: Record<string, string> = {};
  for (const line of header ?? []) {
    const [pair] = line.split(';');
    const [name, ...value] = pair.split('=');
    cookies[name] = value.join('=');
  }
  return cookies;
}

function setCookieLine(res: request.Response, name: string): string {
  const header = res.headers['set-cookie'] as unknown as string[];
  return header.find((line) => line.startsWith(`${name}=`)) ?? '';
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let mongo: MongoMemoryServer;
  let sessions: Model<Session>;

  const jane = {
    name: 'Jane Doe',
    email: 'Jane@Example.com',
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

    const { AppModule } = await import('./../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({ ping: jest.fn(), quit: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    sessions = moduleFixture.get(getModelToken(Session.name));
    // Unique email index must exist before the duplicate sign-up test
    await moduleFixture
      .get<Model<User>>(getModelToken(User.name))
      .syncIndexes();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  const http = () => request(app.getHttpServer());

  describe('register', () => {
    it('creates a member, signs them in and never returns the password', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send(jane)
        .expect(201);
      const body = res.body as UserBody;

      expect(body.user).toMatchObject({
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);

      const access = setCookieLine(res, 'access_token');
      const refresh = setCookieLine(res, 'refresh_token');
      expect(access).toMatch(/HttpOnly/);
      expect(access).toMatch(/SameSite=Lax/);
      expect(access).toMatch(/Path=\/api/);
      expect(refresh).toMatch(/HttpOnly/);
      expect(refresh).toMatch(/Path=\/api\/auth/);
    });

    it('rejects a second account with the same email, in any letter case', async () => {
      await http()
        .post('/api/auth/register')
        .send({ ...jane, email: 'JANE@example.COM' })
        .expect(409);
    });

    it('rejects invalid input', async () => {
      await http()
        .post('/api/auth/register')
        .send({ name: 'J', email: 'not-an-email', password: 'short' })
        .expect(400);
      await http()
        .post('/api/auth/register')
        .send({ ...jane, email: 'other@example.com', role: 'ADMIN' })
        .expect(400); // nobody can make themselves an admin
    });
  });

  describe('login and me', () => {
    it('signs in with the right password and returns the user from /me', async () => {
      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'jane@example.com', password: jane.password })
        .expect(200);
      const { access_token } = cookiesFrom(login);

      const me = await http()
        .get('/api/auth/me')
        .set('Cookie', `access_token=${access_token}`)
        .expect(200);
      expect((me.body as UserBody).user.email).toBe('jane@example.com');
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await http()
        .post('/api/auth/login')
        .send({ email: 'jane@example.com', password: 'wrong password' })
        .expect(401);
      const unknownEmail = await http()
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong password' })
        .expect(401);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });

    it('rejects /me without a valid access token', async () => {
      await http().get('/api/auth/me').expect(401);
      await http()
        .get('/api/auth/me')
        .set('Cookie', 'access_token=forged.jwt.value')
        .expect(401);
    });
  });

  describe('refresh token rotation', () => {
    async function signIn() {
      const res = await http()
        .post('/api/auth/login')
        .send({ email: 'jane@example.com', password: jane.password })
        .expect(200);
      return cookiesFrom(res).refresh_token;
    }

    const refreshWith = (token: string) =>
      http().post('/api/auth/refresh').set('Cookie', `refresh_token=${token}`);

    it('issues a new refresh token each time', async () => {
      const first = await signIn();
      const res = await refreshWith(first).expect(200);
      const second = cookiesFrom(res).refresh_token;

      expect(second).toBeDefined();
      expect(second).not.toBe(first);
      await refreshWith(second).expect(200);
    });

    it('treats reuse of an old token as theft and ends the session', async () => {
      const stolen = await signIn();
      const res = await refreshWith(stolen).expect(200);
      const current = cookiesFrom(res).refresh_token;

      // Simulate the grace period having passed
      const [sessionId] = stolen.split('.');
      await sessions.updateOne(
        { _id: sessionId },
        { rotatedAt: new Date(Date.now() - 60_000) },
      );

      await refreshWith(stolen).expect(401);
      // The legitimate user's newer token is revoked too
      await refreshWith(current).expect(401);
    });

    it('does not end the session when two tabs refresh at the same moment', async () => {
      const shared = await signIn();
      const res = await refreshWith(shared).expect(200);
      const current = cookiesFrom(res).refresh_token;

      await refreshWith(shared).expect(401); // the slower tab
      await refreshWith(current).expect(200); // still signed in
    });

    it('keeps the session when refreshes arrive truly in parallel', async () => {
      const shared = await signIn();
      const results = await Promise.all(
        Array.from({ length: 5 }, () => refreshWith(shared)),
      );

      // Exactly one request wins the rotation; the others are told to retry
      const winners = results.filter((r) => r.status === 200);
      expect(winners).toHaveLength(1);
      expect(results.filter((r) => r.status === 401)).toHaveLength(4);

      // ...and the winner's new token still works: nobody was signed out
      await refreshWith(cookiesFrom(winners[0]).refresh_token).expect(200);
    });

    it('logout needs the real token, not just the session id', async () => {
      const token = await signIn();
      const [sessionId] = token.split('.');

      await http()
        .post('/api/auth/logout')
        .set('Cookie', `refresh_token=${sessionId}.forged-secret`)
        .expect(204);
      await refreshWith(token).expect(200); // still signed in
    });

    it('rejects garbage tokens', async () => {
      await refreshWith('nonsense').expect(401);
      await refreshWith('6560a1b2c3d4e5f6a7b8c9d0.secret').expect(401);
      await http().post('/api/auth/refresh').expect(401);
    });
  });

  describe('logout', () => {
    it('ends the session and clears the cookies', async () => {
      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'jane@example.com', password: jane.password })
        .expect(200);
      const { refresh_token } = cookiesFrom(login);

      const res = await http()
        .post('/api/auth/logout')
        .set('Cookie', `refresh_token=${refresh_token}`)
        .expect(204);
      expect(setCookieLine(res, 'refresh_token')).toMatch(
        /Expires=Thu, 01 Jan 1970/,
      );

      await http()
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refresh_token}`)
        .expect(401);
    });
  });

  describe('rate limiting', () => {
    it('blocks an IP after 10 login attempts in a minute', async () => {
      const attempt = () =>
        http()
          .post('/api/auth/login')
          .set('X-Forwarded-For', '203.0.113.99')
          .send({ email: 'jane@example.com', password: 'guess' });

      for (let i = 0; i < 10; i++) await attempt().expect(401);
      await attempt().expect(429);
    });
  });
});
