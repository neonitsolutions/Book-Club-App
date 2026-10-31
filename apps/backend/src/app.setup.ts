import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Env } from './config/env.validation';

/**
 * Middleware, pipes and prefix shared by main.ts and the e2e tests, so the
 * tests exercise the same HTTP behaviour as production.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // One proxy hop (the load balancer): req.ip is the real client IP, which
  // the rate limiter keys on
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Must be set before listen(), otherwise routes are not prefixed
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
}
