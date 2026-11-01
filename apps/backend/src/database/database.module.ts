import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Counter, CounterSchema } from './counter.schema';
import { SequenceService } from './sequence.service';

// Global so any module can generate inventory codes or order numbers
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }]),
  ],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class DatabaseModule {}
