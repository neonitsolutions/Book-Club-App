import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Counter } from './counter.schema';

@Injectable()
export class SequenceService {
  constructor(
    @InjectModel(Counter.name) private readonly counters: Model<Counter>,
  ) {}

  /** Reserves `count` consecutive numbers and returns the first. */
  async next(
    name: string,
    count = 1,
    session?: ClientSession,
  ): Promise<number> {
    const counter = await this.counters
      .findOneAndUpdate(
        { _id: name },
        { $inc: { seq: count } },
        { upsert: true, new: true, session },
      )
      .exec();
    return counter.seq - count + 1;
  }
}
