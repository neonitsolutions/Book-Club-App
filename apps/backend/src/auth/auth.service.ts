import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from '@node-rs/argon2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Model, isValidObjectId } from 'mongoose';
import { PublicUser, UserDocument, toPublicUser } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.cookies';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Session } from './session.schema';
import { AccessTokenPayload } from './jwt-payload';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_SESSION = 'Session expired, please sign in again';

const ROTATION_GRACE_MS = 30_000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class AuthService {
  // Verified against when the email does not exist, so a wrong email takes as
  // long as a wrong password and response times do not reveal who has an account
  private readonly dummyHash = argon2.hash(randomBytes(16).toString('hex'));

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
  ) {}

  async register(dto: RegisterDto, client: ClientInfo): Promise<AuthResult> {
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.startSession(user, client);
  }

  async login(dto: LoginDto, client: ClientInfo): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) {
      await argon2.verify(await this.dummyHash, dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.startSession(user, client);
  }

  /** Swaps a refresh token for a new access token and a new refresh token. */
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    const [sessionId, secret] = (refreshToken ?? '').split('.');
    if (!sessionId || !secret || !isValidObjectId(sessionId)) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const presented = sha256(secret);
    const newSecret = randomBytes(32).toString('base64url');
    const now = new Date();

    // One atomic read-and-write: of several requests presenting the same
    // token at once, exactly one matches and rotates it. A separate read then
    // save would let each of them issue its own token, all but one unusable.
    const session = await this.sessions
      .findOneAndUpdate(
        { _id: sessionId, tokenHash: presented, expiresAt: { $gt: now } },
        {
          $set: {
            previousTokenHash: presented,
            rotatedAt: now,
            tokenHash: sha256(newSecret),
            expiresAt: new Date(
              now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000,
            ),
          },
        },
        { new: true },
      )
      .exec();

    if (!session) {
      await this.rejectStaleToken(sessionId, presented);
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const user = await this.users.findById(session.userId.toString());
    if (!user) {
      await session.deleteOne();
      throw new UnauthorizedException(INVALID_SESSION);
    }

    return {
      user: toPublicUser(user),
      accessToken: await this.signAccessToken(user),
      refreshToken: `${session.id as string}.${newSecret}`,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    const [sessionId, secret] = (refreshToken ?? '').split('.');
    if (!sessionId || !secret || !isValidObjectId(sessionId)) return;

    // Only the holder of the token can end the session, not anyone who
    // learns its id
    const hash = sha256(secret);
    await this.sessions
      .deleteOne({
        _id: sessionId,
        $or: [{ tokenHash: hash }, { previousTokenHash: hash }],
      })
      .exec();
  }

  /**
   * The token did not match the current one. If it is the one replaced in
   * the last few seconds, another tab just refreshed: refuse, but keep the
   * session (the browser already has the new cookies). Anything older means
   * a copy of the token is in someone else's hands: end the session so
   * neither copy works.
   */
  private async rejectStaleToken(
    sessionId: string,
    presented: string,
  ): Promise<void> {
    const session = await this.sessions.findById(sessionId).exec();
    if (!session) return;

    const justRotated =
      session.previousTokenHash !== undefined &&
      hashesEqual(presented, session.previousTokenHash) &&
      !!session.rotatedAt &&
      Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;
    if (!justRotated) await session.deleteOne();
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException(INVALID_SESSION);
    return toPublicUser(user);
  }

  private async startSession(
    user: UserDocument,
    client: ClientInfo,
  ): Promise<AuthResult> {
    const secret = randomBytes(32).toString('base64url');
    const session = await this.sessions.create({
      userId: user._id,
      tokenHash: sha256(secret),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      userAgent: client.userAgent?.slice(0, 256),
      ip: client.ip,
    });

    return {
      user: toPublicUser(user),
      accessToken: await this.signAccessToken(user),
      refreshToken: `${session.id as string}.${secret}`,
    };
  }

  private signAccessToken(user: UserDocument): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id as string,
      role: user.role,
    };
    return this.jwt.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }
}
