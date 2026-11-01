import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { kobo } from '../common/money';

/** Which stock a copy belongs to. A copy is never both rentable and for sale. */
export enum CopyPurpose {
  RENTAL = 'RENTAL',
  SALE = 'SALE',
}

export enum CopyStatus {
  AVAILABLE = 'AVAILABLE',
  // Held for a rental request or an unpaid order until reservation.expiresAt
  RESERVED = 'RESERVED',
  RENTED = 'RENTED',
  SOLD = 'SOLD',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  IN_REPAIR = 'IN_REPAIR',
  // Taken out of circulation for good (worn out, donated)
  RETIRED = 'RETIRED',
}

export enum CopyCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
}

export enum ReservationKind {
  RENTAL = 'RENTAL',
  ORDER = 'ORDER',
}

@Schema({ _id: false })
export class CopyReservation {
  @Prop({ type: String, enum: ReservationKind, required: true })
  kind: ReservationKind;

  // The Rental or Order holding the copy
  @Prop({ type: Types.ObjectId, required: true })
  refId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  reservedAt: Date;

  // A scheduled job puts copies back to AVAILABLE after this time
  @Prop({ required: true })
  expiresAt: Date;
}

const CopyReservationSchema = SchemaFactory.createForClass(CopyReservation);

/** One physical book on a shelf, with its own QR label. */
@Schema({ timestamps: true })
export class BookCopy {
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  // Human-readable, printed under the QR code, typed in when a camera is not
  // available: "RBC-ATOMIC-0001"
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  inventoryCode: string;

  // Random value the QR code encodes. Unlike the inventory code it cannot be
  // guessed, so a member confirming receipt by scan must really hold the
  // book. Never returned in public API responses.
  @Prop({ required: true, unique: true, select: false })
  qrToken: string;

  @Prop({ type: String, enum: CopyPurpose, required: true })
  purpose: CopyPurpose;

  @Prop({ type: String, enum: CopyStatus, default: CopyStatus.AVAILABLE })
  status: CopyStatus;

  @Prop({ type: String, enum: CopyCondition, default: CopyCondition.GOOD })
  condition: CopyCondition;

  @Prop({
    required: true,
    uppercase: true,
    trim: true,
    default: 'MAIN_LIBRARY',
  })
  location: string;

  @Prop({ type: CopyReservationSchema })
  reservation?: CopyReservation;

  // Set while RENTED
  @Prop({ type: Types.ObjectId, ref: 'Rental' })
  currentRentalId?: Types.ObjectId;

  // Set once SOLD
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  soldOrderId?: Types.ObjectId;

  @Prop()
  acquisitionDate?: Date;

  @Prop({ ...kobo })
  purchasePriceKobo?: number;

  @Prop({ ...kobo })
  currentValueKobo?: number;

  @Prop({ default: 0 })
  timesRented: number;

  // Updated on every scan, for spotting copies nobody has seen in months
  @Prop()
  lastScannedAt?: Date;

  @Prop({ trim: true, maxlength: 2000 })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type BookCopyDocument = HydratedDocument<BookCopy>;
export const BookCopySchema = SchemaFactory.createForClass(BookCopy);

// Finding a free copy of a title, and counting copies per status
BookCopySchema.index({ bookId: 1, purpose: 1, status: 1 });
// Inventory dashboard filters
BookCopySchema.index({ status: 1, location: 1 });
// Job that releases reservations nobody completed
BookCopySchema.index(
  { 'reservation.expiresAt': 1 },
  { partialFilterExpression: { status: CopyStatus.RESERVED } },
);
