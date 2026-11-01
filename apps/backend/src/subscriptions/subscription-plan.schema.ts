import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { kobo } from '../common/money';

/**
 * A plan the admin offers, e.g. "Monthly: ₦5,000 for 30 days, 3 books at a
 * time". Editing a plan does not change what existing members bought: each
 * Membership keeps a snapshot of the terms at the time of payment.
 */
@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ trim: true, maxlength: 2000 })
  description?: string;

  @Prop({ ...kobo, required: true })
  priceKobo: number;

  // How long one payment keeps the membership active
  @Prop({ required: true, min: 1, max: 3660 })
  durationDays: number;

  // Books a member can hold at the same time
  @Prop({ required: true, min: 1 })
  maxActiveRentals: number;

  // Books a member can borrow in total during one membership period;
  // unset means no limit beyond maxActiveRentals
  @Prop({ min: 1 })
  maxRentalsPerPeriod?: number;

  // How long each borrowed book may be kept
  @Prop({ required: true, min: 1 })
  rentalPeriodDays: number;

  // How many times a member may extend one rental
  @Prop({ default: 1, min: 0 })
  maxRenewalsPerRental: number;

  @Prop({ ...kobo, default: 0 })
  lateFeePerDayKobo: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  // Inactive plans cannot be bought; existing memberships keep running
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;
export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);

SubscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
