import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  MONGODB_URI: z.string().startsWith('mongodb'),
  REDIS_URL: z.string().startsWith('redis'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  // Signs access tokens. Generate with: openssl rand -base64 48
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters (openssl rand -base64 48)'),
  // Public address of the site, for links in emails
  APP_URL: z.url().default('http://localhost:3000'),
  // When 'false', sign-up signs people in straight away and no activation
  // email is sent (e.g. while SES is still in its sandbox). Turn it back on
  // without code changes once email delivery works.
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  // Sender for account emails, e.g. "Readers Club <no-reply@example.com>".
  // Unset outside production: emails are written to the log instead.
  MAIL_FROM: z.string().min(3).optional(),
  // S3 bucket and CDN for book pictures. Unset locally: files are kept in
  // MEDIA_DIR and served by the backend.
  MEDIA_BUCKET: z.string().min(3).optional(),
  CDN_URL: z.url().optional(),
  MEDIA_DIR: z.string().default('./uploads'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema
    .superRefine((env, ctx) => {
      if (env.NODE_ENV !== 'production') return;
      // Without these, sign-up emails or picture uploads would silently fail
      const required = ['MEDIA_BUCKET', 'CDN_URL'] as const;
      const keys = env.REQUIRE_EMAIL_VERIFICATION
        ? (['MAIL_FROM', ...required] as const)
        : required;
      for (const key of keys) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'is required in production',
          });
        }
      }
    })
    .safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
