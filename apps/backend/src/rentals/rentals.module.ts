import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rental, RentalSchema } from './rental.schema';

const models = MongooseModule.forFeature([
  { name: Rental.name, schema: RentalSchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class RentalsModule {}
