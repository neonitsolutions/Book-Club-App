import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './membership.schema';
import { MembershipsService } from './memberships.service';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './subscription-plan.schema';

const models = MongooseModule.forFeature([
  { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
  { name: Membership.name, schema: MembershipSchema },
]);

@Module({
  imports: [models],
  providers: [MembershipsService],
  exports: [models, MembershipsService],
})
export class SubscriptionsModule {}
