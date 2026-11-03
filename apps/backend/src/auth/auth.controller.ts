import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Env } from '../config/env.validation';
import { PublicUser } from '../users/user.schema';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './auth.cookies';
import { AuthResult, AuthService, ClientInfo } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/email-verification.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser } from './jwt-payload';

// Password guessing protection, per client IP (on top of the WAF rule)
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    // Browsers drop Secure cookies on plain http://localhost
    this.secureCookies =
      config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Post('register')
  @Throttle(STRICT)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    | { verificationRequired: true; email: string }
    | { verificationRequired: false; user: PublicUser }
  > {
    const result = await this.auth.register(dto, clientInfo(req));
    if (result.verificationRequired) return result;
    return { verificationRequired: false, ...this.respond(res, result) };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    return this.respond(
      res,
      await this.auth.verifyEmail(dto.token, clientInfo(req)),
    );
  }

  // Always 204, whether or not the email has an account
  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    await this.auth.resendVerification(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    return this.respond(res, await this.auth.login(dto, clientInfo(req)));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    return this.respond(res, await this.auth.refresh(refreshCookie(req)));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(refreshCookie(req));
    clearAuthCookies(res, this.secureCookies);
  }

  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser): Promise<{ user: PublicUser }> {
    return { user: await this.auth.me(user.id) };
  }

  private respond(res: Response, result: AuthResult): { user: PublicUser } {
    setAuthCookies(res, result, this.secureCookies);
    return { user: result.user };
  }
}

function refreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
}

function clientInfo(req: Request): ClientInfo {
  return { userAgent: req.get('user-agent'), ip: req.ip };
}
