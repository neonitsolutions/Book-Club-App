import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * One document per signed-in device. The refresh token sent to the browser is
 * `<sessionId>.<secret>`; only a SHA-256 hash of the current secret is stored.
 * Every refresh replaces the secret (rotation). Presenting an old secret means
 * the token was copied, so the whole session is revoked.
 */
@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  tokenHash: string;

  // The secret replaced by the last rotation. Two tabs refreshing at the same
  // moment both present it; within a short grace period that is not theft.
  @Prop()
  previousTokenHash?: string;

  @Prop()
  rotatedAt?: Date;

  // MongoDB deletes the document once this time has passed
  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ip?: string;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);
