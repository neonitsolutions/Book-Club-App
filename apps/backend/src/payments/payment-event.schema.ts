import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { PaymentProvider } from './payment.schema';

export enum PaymentEventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  IGNORED = 'IGNORED',
  FAILED = 'FAILED',
}

/**
 * Every webhook a gateway sends. Gateways retry deliveries, so the same event
 * can arrive several times; the unique index lets only the first insert win,
 * and a membership is never activated twice for one payment.
 */
@Schema({ timestamps: true })
export class PaymentEvent {
  @Prop({ type: String, enum: PaymentProvider, required: true })
  provider: PaymentProvider;

  @Prop({ required: true })
  eventId: string;

  // e.g. "charge.success"
  @Prop({ required: true })
  type: string;

  // Payment.reference the event is about
  @Prop({ index: true })
  reference?: string;

  @Prop({
    type: String,
    enum: PaymentEventStatus,
    default: PaymentEventStatus.RECEIVED,
  })
  status: PaymentEventStatus;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload: Record<string, unknown>;

  @Prop()
  error?: string;

  @Prop()
  processedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type PaymentEventDocument = HydratedDocument<PaymentEvent>;
export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);

PaymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
