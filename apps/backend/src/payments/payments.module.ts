import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './payment.schema';
import { PaymentEvent, PaymentEventSchema } from './payment-event.schema';

const models = MongooseModule.forFeature([
  { name: Payment.name, schema: PaymentSchema },
  { name: PaymentEvent.name, schema: PaymentEventSchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class PaymentsModule {}
