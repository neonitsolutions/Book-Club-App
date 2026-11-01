import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScanEvent, ScanEventSchema } from './scan-event.schema';

const models = MongooseModule.forFeature([
  { name: ScanEvent.name, schema: ScanEventSchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class ScansModule {}
