import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  Membership,
  MembershipDocument,
  RENTING_STATUSES,
} from './membership.schema';

type Id = string | Types.ObjectId;

@Injectable()
export class MembershipsService {
  constructor(
    @InjectModel(Membership.name)
    private readonly memberships: Model<Membership>,
  ) {}

  /** The membership the member can rent with right now, if any. */
  findLive(userId: Id): Promise<MembershipDocument | null> {
    return this.memberships
      .findOne({
        userId,
        status: { $in: RENTING_STATUSES },
        endsAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Takes one of the member's rental slots, or returns false when the plan's
   * limit is reached or the membership is not live. The limit check and the
   * increment are one atomic update, so a member opening five tabs on a
   * 3-book plan still ends up with at most 3 books.
   */
  async claimRentalSlot(
    membershipId: Id,
    userId: Id,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.memberships
      .updateOne(
        {
          _id: membershipId,
          userId,
          status: { $in: RENTING_STATUSES },
          endsAt: { $gt: new Date() },
          $expr: {
            $and: [
              { $lt: ['$activeRentalCount', '$terms.maxActiveRentals'] },
              {
                $or: [
                  {
                    $eq: [
                      { $ifNull: ['$terms.maxRentalsPerPeriod', null] },
                      null,
                    ],
                  },
                  {
                    $lt: ['$periodRentalCount', '$terms.maxRentalsPerPeriod'],
                  },
                ],
              },
            ],
          },
        },
        { $inc: { activeRentalCount: 1, periodRentalCount: 1 } },
        { session },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  /**
   * Gives a slot back when a book is returned, lost or a reservation lapses.
   * periodRentalCount is not reduced: the rental still counts for the period.
   */
  async releaseRentalSlot(
    membershipId: Id,
    session?: ClientSession,
  ): Promise<void> {
    await this.memberships
      .updateOne(
        { _id: membershipId, activeRentalCount: { $gt: 0 } },
        { $inc: { activeRentalCount: -1 } },
        { session },
      )
      .exec();
  }
}
