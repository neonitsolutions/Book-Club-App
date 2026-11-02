import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

/**
 * A pending "verify your email" link. The link holds a random token; only its
 * SHA-256 hash is stored, so a database leak cannot be used to verify
 * accounts. Single use, and MongoDB deletes it once expired.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class EmailVerification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;

  createdAt: Date;
}

export type EmailVerificationDocument = HydratedDocument<EmailVerification>;
export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);
