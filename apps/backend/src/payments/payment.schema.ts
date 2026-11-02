import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CURRENCY, kobo } from '../common/money';

export enum PaymentProvider {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
  // Cash or transfer recorded by staff at the counter
  MANUAL = 'MANUAL',
}

export enum PaymentPurpose {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ORDER = 'ORDER',
  LATE_FEE = 'LATE_FEE',
  DAMAGE_FEE = 'DAMAGE_FEE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
  REFUNDED = 'REFUNDED',
}

/**
 * One attempt to collect money. Created before redirecting to the gateway;
 * becomes SUCCEEDED only after the gateway confirms it server-to-server
 * (verify call or signed webhook), never because the browser said so.
 */
@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: PaymentPurpose, required: true })
  purpose: PaymentPurpose;

  // The Membership, Order or Rental being paid for
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  refId: Types.ObjectId;

  @Prop({ ...kobo, required: true })
  amountKobo: number;

  @Prop({ default: CURRENCY })
  currency: string;

  @Prop({ type: String, enum: PaymentProvider, required: true })
  provider: PaymentProvider;

  // Our reference, sent to the gateway and echoed back in its webhooks
  @Prop({ required: true, unique: true })
  reference: string;

  // The gateway's own transaction id, once known
  @Prop()
  providerTransactionId?: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // Hosted checkout page the member is sent to
  @Prop()
  checkoutUrl?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  failureReason?: string;

  // Amount the gateway reported. Compared with amountKobo before accepting,
  // so a tampered checkout cannot pay ₦1 for a ₦5,000 plan.
  @Prop({ ...kobo })
  providerAmountKobo?: number;

  // Gateway response, for support and reconciliation. Never card details:
  // the gateways do not send them and we must not store them.
  @Prop({ type: MongooseSchema.Types.Mixed })
  providerData?: Record<string, unknown>;

  // Staff member who recorded a MANUAL payment
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  recordedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index(
  { provider: 1, providerTransactionId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerTransactionId: { $type: 'string' } },
  },
);
PaymentSchema.index({ purpose: 1, refId: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
// Revenue reports
PaymentSchema.index({ status: 1, purpose: 1, paidAt: -1 });
