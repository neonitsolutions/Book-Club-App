import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksModule } from '../books/books.module';
import { BookCopy, BookCopySchema } from './book-copy.schema';
import { InventoryService } from './inventory.service';

const models = MongooseModule.forFeature([
  { name: BookCopy.name, schema: BookCopySchema },
]);

@Module({
  imports: [models, BooksModule],
  providers: [InventoryService],
  exports: [models, InventoryService],
})
export class InventoryModule {}
