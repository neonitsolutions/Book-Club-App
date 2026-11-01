import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { kobo } from '../common/money';
import { CopyCondition } from '../inventory/book-copy.schema';

export enum RentalStatus {
  // Member asked for the book; a copy is held for pickup
  RESERVED = 'RESERVED',
  // Staff scanned the copy out; the member has it
  ACTIVE = 'ACTIVE',
  // Past dueAt and not returned; set by the overdue job
  OVERDUE = 'OVERDUE',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
  // Member cancelled before pickup
  CANCELLED = 'CANCELLED',
  // Not picked up before reservationExpiresAt
  EXPIRED = 'EXPIRED',
}

/** Statuses in which the rental holds a copy. */
export const OPEN_RENTAL_STATUSES = [
  RentalStatus.RESERVED,
  RentalStatus.ACTIVE,
  RentalStatus.OVERDUE,
];

export enum LateFeeStatus {
  NONE = 'NONE',
  DUE = 'DUE',
  PAID = 'PAID',
  WAIVED = 'WAIVED',
}

@Schema({ _id: false })
export class RentalExtension {
  @Prop({ required: true })
  at: Date;

  @Prop({ required: true })
  previousDueAt: Date;

  @Prop({ required: true })
  newDueAt: Date;
}

const RentalExtensionSchema = SchemaFactory.createForClass(RentalExtension);

@Schema({ _id: false })
export class LateFee {
  @Prop({ type: String, enum: LateFeeStatus, default: LateFeeStatus.NONE })
  status: LateFeeStatus;

  @Prop({ default: 0 })
  daysLate: number;

  @Prop({ ...kobo, default: 0 })
  amountKobo: number;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  waivedBy?: Types.ObjectId;
}

const LateFeeSchema = SchemaFactory.createForClass(LateFee);

/** One physical copy lent to one member. */
@Schema({ timestamps: true })
export class Rental {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Membership', required: true })
  membershipId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BookCopy', required: true })
  copyId: Types.ObjectId;

  // Copied from the book and copy so history reads well after edits
  @Prop({ required: true })
  bookTitle: string;

  @Prop({ required: true })
  inventoryCode: string;

  @Prop({ type: String, enum: RentalStatus, default: RentalStatus.RESERVED })
  status: RentalStatus;

  @Prop({ required: true })
  reservedAt: Date;

  @Prop({ required: true })
  reservationExpiresAt: Date;

  @Prop()
  checkedOutAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  checkedOutBy?: Types.ObjectId;

  // Set at checkout: checkedOutAt + terms.rentalPeriodDays
  @Prop()
  dueAt?: Date;

  @Prop({ type: [RentalExtensionSchema], default: [] })
  extensions: RentalExtension[];

  // The member scanned the QR label to confirm they have the book
  @Prop()
  memberConfirmedReceiptAt?: Date;

  // The member scanned the label when handing the book back
  @Prop()
  memberConfirmedReturnAt?: Date;

  @Prop()
  returnedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  returnedTo?: Types.ObjectId;

  @Prop({ type: String, enum: CopyCondition })
  conditionAtCheckout?: CopyCondition;

  @Prop({ type: String, enum: CopyCondition })
  conditionAtReturn?: CopyCondition;

  @Prop({ type: LateFeeSchema, default: () => ({}) })
  lateFee: LateFee;

  @Prop({ trim: true, maxlength: 2000 })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type RentalDocument = HydratedDocument<Rental>;
export const RentalSchema = SchemaFactory.createForClass(Rental);

// A copy can be in at most one open rental. A bug elsewhere cannot lend the
// same book to two people: MongoDB rejects the second insert.
RentalSchema.index(
  { copyId: 1 },
  {
    unique: true,
    name: 'one_open_rental_per_copy',
    partialFilterExpression: { status: { $in: OPEN_RENTAL_STATUSES } },
  },
);
RentalSchema.index({ userId: 1, status: 1, createdAt: -1 });
RentalSchema.index({ copyId: 1, createdAt: -1 });
// Overdue job and the admin's overdue list
RentalSchema.index({ status: 1, dueAt: 1 });
// Job that expires reservations nobody picked up
RentalSchema.index(
  { reservationExpiresAt: 1 },
  { partialFilterExpression: { status: RentalStatus.RESERVED } },
);
