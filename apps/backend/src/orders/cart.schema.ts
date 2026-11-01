import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum CartKind {
  // Books the member wants to borrow
  RENTAL = 'RENTAL',
  // Books the member wants to buy
  PURCHASE = 'PURCHASE',
}

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Book', required: true })
  bookId: Types.ObjectId;

  // Always 1 in a rental cart
  @Prop({ required: true, min: 1, max: 20, default: 1 })
  quantity: number;

  @Prop({ required: true })
  addedAt: Date;
}

const CartItemSchema = SchemaFactory.createForClass(CartItem);

/**
 * A wish list, not a hold: no copy is reserved and prices are not fixed
 * until checkout creates the Order or Rentals.
 */
@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: CartKind, required: true })
  kind: CartKind;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  createdAt: Date;
  updatedAt: Date;
}

export type CartDocument = HydratedDocument<Cart>;
export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ userId: 1, kind: 1 }, { unique: true });
