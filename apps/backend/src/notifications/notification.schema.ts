import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Schema({ _id: false })
export class ChannelDelivery {
  @Prop({ type: String, enum: NotificationChannel, required: true })
  channel: NotificationChannel;

  @Prop({ type: String, enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Prop({ default: 0 })
  attempts: number;

  @Prop()
  sentAt?: Date;

  // Message id from the email/SMS provider
  @Prop()
  providerMessageId?: string;

  @Prop()
  error?: string;
}

const ChannelDeliverySchema = SchemaFactory.createForClass(ChannelDelivery);

const RETENTION_DAYS = 180;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // e.g. "rental.due_soon", "membership.expiring", "order.ready_for_pickup"
  @Prop({ required: true })
  type: string;

  @Prop({ required: true, maxlength: 200 })
  title: string;

  @Prop({ required: true, maxlength: 2000 })
  body: string;

  // Where the in-app notification links to, e.g. "/rentals/6560a1b2..."
  @Prop()
  link?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data?: Record<string, unknown>;

  @Prop({ type: [ChannelDeliverySchema], default: [] })
  deliveries: ChannelDelivery[];

  @Prop()
  readAt?: Date;

  // Makes scheduled reminders safe to re-run: the job inserts
  // "rental.due_soon:<rentalId>:<dueAt>" and a duplicate insert fails
  @Prop()
  dedupeKey?: string;

  // MongoDB deletes the notification after this time
  @Prop({
    default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 3600 * 1000),
  })
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
// Unread badge count
NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);
// Sender worker picks up pending email/SMS deliveries
NotificationSchema.index({ 'deliveries.status': 1, createdAt: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
