import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { kobo } from '../common/money';

export enum OrderStatus {
  // Copies are reserved until reservationExpiresAt
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  // Every copy scanned out to the buyer; copies are SOLD
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum FulfilmentMethod {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

/** One line per physical copy, so each copy is scanned and tracked. */
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BookCopy', required: true })
  copyId: Types.ObjectId;

  // Title and price at the time of the order; later edits do not change it
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  inventoryCode: string;

  @Prop({ ...kobo, required: true })
  unitPriceKobo: number;

  // Staff scanned this copy when handing it over or packing it
  @Prop()
  scannedOutAt?: Date;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class DeliveryAddress {
  @Prop({ required: true, trim: true })
  recipientName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  line1: string;

  @Prop({ trim: true })
  line2?: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  state: string;

  @Prop({ trim: true })
  landmark?: string;
}

const DeliveryAddressSchema = SchemaFactory.createForClass(DeliveryAddress);

@Schema({ _id: false })
export class OrderStatusChange {
  @Prop({ type: String, enum: OrderStatus, required: true })
  status: OrderStatus;

  @Prop({ required: true })
  at: Date;

  // Unset when the system made the change (payment webhook, expiry job)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  by?: Types.ObjectId;

  @Prop()
  note?: string;
}

const OrderStatusChangeSchema = SchemaFactory.createForClass(OrderStatusChange);

@Schema({ timestamps: true })
export class Order {
  // "RBC-ORD-000123", shown to the customer
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: [OrderItemSchema],
    required: true,
    validate: {
      validator: (items: OrderItem[]) => items.length > 0,
      message: 'An order needs at least one item',
    },
  })
  items: OrderItem[];

  @Prop({ ...kobo, required: true })
  subtotalKobo: number;

  @Prop({ ...kobo, default: 0 })
  deliveryFeeKobo: number;

  @Prop({ ...kobo, required: true })
  totalKobo: number;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Prop({ type: [OrderStatusChangeSchema], default: [] })
  statusHistory: OrderStatusChange[];

  @Prop({ type: String, enum: FulfilmentMethod, required: true })
  fulfilmentMethod: FulfilmentMethod;

  @Prop({ type: DeliveryAddressSchema })
  deliveryAddress?: DeliveryAddress;

  @Prop({ required: true })
  reservationExpiresAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop()
  paidAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ trim: true, maxlength: 1000 })
  customerNote?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.pre('validate', function () {
  const sum = this.items.reduce((total, item) => total + item.unitPriceKobo, 0);
  if (this.subtotalKobo !== sum) {
    this.invalidate('subtotalKobo', 'must equal the sum of item prices');
  }
  if (this.totalKobo !== this.subtotalKobo + this.deliveryFeeKobo) {
    this.invalidate('totalKobo', 'must equal subtotal plus delivery fee');
  }
  if (
    this.fulfilmentMethod === FulfilmentMethod.DELIVERY &&
    !this.deliveryAddress
  ) {
    this.invalidate('deliveryAddress', 'is required for delivery orders');
  }
});

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
// Staff scanning a copy finds the order it belongs to
OrderSchema.index({ 'items.copyId': 1 });
// Job that cancels unpaid orders and releases their copies
OrderSchema.index(
  { reservationExpiresAt: 1 },
  { partialFilterExpression: { status: OrderStatus.PENDING_PAYMENT } },
);
