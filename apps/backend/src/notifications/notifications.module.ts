import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './notification.schema';

const models = MongooseModule.forFeature([
  { name: Notification.name, schema: NotificationSchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class NotificationsModule {}
