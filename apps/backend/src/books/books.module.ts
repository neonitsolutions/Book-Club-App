import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Author, AuthorSchema } from './author.schema';
import { Book, BookSchema } from './book.schema';
import { Category, CategorySchema } from './category.schema';

const models = MongooseModule.forFeature([
  { name: Book.name, schema: BookSchema },
  { name: Author.name, schema: AuthorSchema },
  { name: Category.name, schema: CategorySchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class BooksModule {}
