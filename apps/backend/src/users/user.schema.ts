import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from './role.enum';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  // Stored lowercase; the unique index makes duplicate sign-ups impossible
  // even when two requests race
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // Never returned by queries unless explicitly selected with +passwordHash
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: Role, default: Role.MEMBER })
  role: Role;

  // null: signed up, has not clicked the verification link yet, cannot sign
  // in. A date: verified. Missing: account created before verification
  // existed, treated as verified so nobody already signed up is locked out.
  @Prop({ type: Date, default: undefined })
  emailVerifiedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

/** The shape the API returns: no password hash, no Mongo internals. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
}

export function isEmailVerified(user: Pick<User, 'emailVerifiedAt'>): boolean {
  return user.emailVerifiedAt !== null;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: isEmailVerified(user),
    createdAt: user.createdAt,
  };
}
