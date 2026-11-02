import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { kobo } from '../common/money';

export enum MembershipStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  // Still usable; set by the reminder job a few days before endsAt
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/** Statuses in which the member may rent. Also check endsAt > now. */
export const RENTING_STATUSES = [
  MembershipStatus.ACTIVE,
  MembershipStatus.EXPIRING,
];

/** The plan's terms as they were when the member paid. */
@Schema({ _id: false })
export class PlanTerms {
  @Prop({ required: true })
  name: string;

  @Prop({ ...kobo, required: true })
  priceKobo: number;

  @Prop({ required: true })
  durationDays: number;

  @Prop({ required: true })
  maxActiveRentals: number;

  @Prop()
  maxRentalsPerPeriod?: number;

  @Prop({ required: true })
  rentalPeriodDays: number;

  @Prop({ required: true })
  maxRenewalsPerRental: number;

  @Prop({ ...kobo, required: true })
  lateFeePerDayKobo: number;
}

const PlanTermsSchema = SchemaFactory.createForClass(PlanTerms);

/** One paid stretch of time: the first payment, then each renewal. */
@Schema({ _id: false })
export class MembershipPeriod {
  @Prop({ required: true })
  startsAt: Date;

  @Prop({ required: true })
  endsAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', required: true })
  paymentId: Types.ObjectId;
}

const MembershipPeriodSchema = SchemaFactory.createForClass(MembershipPeriod);

/**
 * A member's subscription to one plan. Renewing extends endsAt and appends a
 * period; switching to another plan ends this membership and starts a new one.
 */
@Schema({ timestamps: true })
export class Membership {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
  })
  planId: Types.ObjectId;

  @Prop({ type: PlanTermsSchema, required: true })
  terms: PlanTerms;

  @Prop({
    type: String,
    enum: MembershipStatus,
    default: MembershipStatus.PENDING_PAYMENT,
  })
  status: MembershipStatus;

  // Set when the first payment is verified
  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop({ type: [MembershipPeriodSchema], default: [] })
  periods: MembershipPeriod[];

  // Books currently out. Changed only through MembershipsService, which
  // refuses to go past terms.maxActiveRentals.
  @Prop({ default: 0, min: 0 })
  activeRentalCount: number;

  // Rentals started in the current period, for terms.maxRentalsPerPeriod
  @Prop({ default: 0, min: 0 })
  periodRentalCount: number;

  @Prop({ default: false })
  autoRenew: boolean;

  @Prop()
  expiryReminderSentAt?: Date;

  @Prop()
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type MembershipDocument = HydratedDocument<Membership>;
export const MembershipSchema = SchemaFactory.createForClass(Membership);

// At most one live membership per member, enforced by MongoDB itself even if
// two payments are verified at the same moment
MembershipSchema.index(
  { userId: 1 },
  {
    unique: true,
    name: 'one_live_membership_per_user',
    partialFilterExpression: { status: { $in: RENTING_STATUSES } },
  },
);
MembershipSchema.index({ userId: 1, createdAt: -1 });
// Expiry and reminder jobs
MembershipSchema.index({ status: 1, endsAt: 1 });
