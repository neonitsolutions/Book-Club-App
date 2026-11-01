import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksModule } from '../../books/books.module';
import { InventoryModule } from '../../inventory/inventory.module';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { UsersModule } from '../../users/users.module';
import { DatabaseModule } from '../database.module';

/**
 * Just enough of the app for database scripts: MongoDB and the services that
 * write to it. No HTTP server, no Redis, and only MONGODB_URI is required.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        serverSelectionTimeoutMS: 5000,
        // The scripts build indexes themselves, and report what they did
        autoIndex: false,
      }),
    }),
    DatabaseModule,
    UsersModule,
    BooksModule,
    InventoryModule,
    SubscriptionsModule,
  ],
})
export class ScriptModule {}
