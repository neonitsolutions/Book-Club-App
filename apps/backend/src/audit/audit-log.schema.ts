import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Role } from '../users/role.enum';

/**
 * Who changed what, for every admin and staff action (prices, plans, roles,
 * copy status, refunds). Append-only: nothing in the app updates or deletes
 * these documents.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  // Unset for system actions (scheduled jobs, payment webhooks)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ type: String, enum: Role })
  actorRole?: Role;

  // "<entity>.<verb>", e.g. "book.update", "copy.mark_lost", "plan.create"
  @Prop({ required: true })
  action: string;

  // Model name: "Book", "BookCopy", "SubscriptionPlan", ...
  @Prop({ required: true })
  entityType: string;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  // Only the fields that changed, as { field: { from, to } }. Never
  // passwords, tokens or other secrets.
  @Prop({ type: MongooseSchema.Types.Mixed })
  changes?: Record<string, { from: unknown; to: unknown }>;

  @Prop({ maxlength: 1000 })
  reason?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
