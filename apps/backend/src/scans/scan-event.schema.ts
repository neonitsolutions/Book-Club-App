import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../users/role.enum';
import { CopyCondition, CopyStatus } from '../inventory/book-copy.schema';

export enum ScanType {
  // Staff hands a rented copy to a member
  CHECKOUT = 'CHECKOUT',
  // Staff takes a rented copy back
  RETURN = 'RETURN',
  // Staff hands a sold copy to a buyer or packs it for delivery
  SALE = 'SALE',
  // Stock-take: "this copy is on this shelf"
  INVENTORY = 'INVENTORY',
  // Member confirms they received their rented copy
  MEMBER_RECEIPT = 'MEMBER_RECEIPT',
  // Member confirms they handed their rented copy back
  MEMBER_RETURN = 'MEMBER_RETURN',
}

export enum ScanMethod {
  CAMERA = 'CAMERA',
  // Inventory code typed in by hand
  MANUAL = 'MANUAL',
}

export enum ScanResult {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/**
 * Append-only record of every scan, accepted or rejected. Rejected scans
 * matter too: a run of them on one copy can mean a mislabeled or stolen book.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ScanEvent {
  @Prop({ type: String, enum: ScanType, required: true })
  type: ScanType;

  @Prop({ type: String, enum: ScanMethod, required: true })
  method: ScanMethod;

  @Prop({ type: String, enum: ScanResult, required: true })
  result: ScanResult;

  // e.g. "Copy is reserved for another member"
  @Prop()
  rejectionReason?: string;

  // Unset when the code matched no copy
  @Prop({ type: Types.ObjectId, ref: 'BookCopy' })
  copyId?: Types.ObjectId;

  // What was scanned or typed, kept even when it matched nothing
  @Prop({ required: true, maxlength: 200 })
  scannedValue: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  scannedBy: Types.ObjectId;

  @Prop({ type: String, enum: Role, required: true })
  scannedByRole: Role;

  @Prop({ type: Types.ObjectId, ref: 'Rental' })
  rentalId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: String, enum: CopyStatus })
  statusBefore?: CopyStatus;

  @Prop({ type: String, enum: CopyStatus })
  statusAfter?: CopyStatus;

  @Prop({ type: String, enum: CopyCondition })
  conditionBefore?: CopyCondition;

  @Prop({ type: String, enum: CopyCondition })
  conditionAfter?: CopyCondition;

  @Prop()
  location?: string;

  @Prop()
  ip?: string;

  createdAt: Date;
}

export type ScanEventDocument = HydratedDocument<ScanEvent>;
export const ScanEventSchema = SchemaFactory.createForClass(ScanEvent);

ScanEventSchema.index({ copyId: 1, createdAt: -1 });
ScanEventSchema.index({ scannedBy: 1, createdAt: -1 });
ScanEventSchema.index({ type: 1, result: 1, createdAt: -1 });
