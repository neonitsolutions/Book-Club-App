import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Named sequences, e.g. { _id: "copy:RBC-ATOMIC", seq: 3 }. Incremented with
 * one atomic $inc, so two admins adding copies at the same moment can never
 * be handed the same number.
 */
@Schema({ versionKey: false })
export class Counter {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
