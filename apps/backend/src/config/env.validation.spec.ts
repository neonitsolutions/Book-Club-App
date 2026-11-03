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

  it('requires email and media settings in production', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production' })).toThrow(
      /MAIL_FROM: is required in production[\s\S]*MEDIA_BUCKET[\s\S]*CDN_URL/,
    );
    expect(
      validateEnv({
        ...valid,
        NODE_ENV: 'production',
        MAIL_FROM: 'Readers Club <no-reply@example.com>',
        MEDIA_BUCKET: 'media-bucket',
        CDN_URL: 'https://cdn.example.com',
      }).NODE_ENV,
    ).toBe('production');
  });

  it('requires email verification by default', () => {
    expect(validateEnv(valid).REQUIRE_EMAIL_VERIFICATION).toBe(true);
    expect(
      validateEnv({ ...valid, REQUIRE_EMAIL_VERIFICATION: 'false' })
        .REQUIRE_EMAIL_VERIFICATION,
    ).toBe(false);
    expect(() =>
      validateEnv({ ...valid, REQUIRE_EMAIL_VERIFICATION: 'no' }),
    ).toThrow(/REQUIRE_EMAIL_VERIFICATION/);
  });

  it('does not need MAIL_FROM in production when verification is off', () => {
    const production = {
      ...valid,
      NODE_ENV: 'production',
      MEDIA_BUCKET: 'media-bucket',
      CDN_URL: 'https://cdn.example.com',
    };
    expect(() => validateEnv(production)).toThrow(/MAIL_FROM/);
    expect(
      validateEnv({ ...production, REQUIRE_EMAIL_VERIFICATION: 'false' })
        .REQUIRE_EMAIL_VERIFICATION,
    ).toBe(false);
  });
});
