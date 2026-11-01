import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.schema';
import { Cart, CartSchema } from './cart.schema';

const models = MongooseModule.forFeature([
  { name: Order.name, schema: OrderSchema },
  { name: Cart.name, schema: CartSchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class OrdersModule {}
