import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const valid = {
    MONGODB_URI: 'mongodb://localhost:27017/test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
  };

  it('applies defaults and splits CORS origins', () => {
    const env = validateEnv({
      ...valid,
      CORS_ORIGIN: 'https://a.com, https://b.com',
    });
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGIN).toEqual(['https://a.com', 'https://b.com']);
  });

  it('fails fast when a required secret is missing', () => {
    expect(() => validateEnv({ REDIS_URL: valid.REDIS_URL })).toThrow(
      /MONGODB_URI/,
    );
  });

  it('rejects a short JWT secret', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });
});
