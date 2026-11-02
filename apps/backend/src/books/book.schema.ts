import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { kobo } from '../common/money';
import { MediaAsset, MediaAssetSchema } from './media-asset.schema';

export enum BookStatus {
  ACTIVE = 'ACTIVE',
  // Hidden from the catalog but kept, because rentals, orders and copies
  // still point at it. Books are archived, never deleted.
  ARCHIVED = 'ARCHIVED',
}

/** Copy counts shown in the catalog, kept in step by InventoryService. */
@Schema({ _id: false })
export class BookAvailability {
  @Prop({ default: 0 })
  rentalTotal: number;

  @Prop({ default: 0 })
  rentalAvailable: number;

  @Prop({ default: 0 })
  saleAvailable: number;
}

const BookAvailabilitySchema = SchemaFactory.createForClass(BookAvailability);

/**
 * A title, e.g. "Atomic Habits". Not a physical book: each physical copy is a
 * BookCopy with its own QR code and status.
 */
@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true, trim: true, maxlength: 300 })
  title: string;

  @Prop({ trim: true, maxlength: 300 })
  subtitle?: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Author' }],
    default: [],
  })
  authorIds: Types.ObjectId[];

  // Copy of the authors' names, so search and listings need no join.
  // Update it whenever authorIds or an author's name changes.
  @Prop({ type: [String], default: [] })
  authorNames: string[];

  // ISBN-13 (or ISBN-10) without hyphens. Optional (old or local books may
  // have none), but unique when present.
  @Prop({ trim: true, match: /^(97[89]\d{10}|\d{9}[\dX])$/ })
  isbn?: string;

  @Prop({ trim: true, maxlength: 10000 })
  description?: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Category' }],
    default: [],
  })
  categoryIds: Types.ObjectId[];

  @Prop({ trim: true, maxlength: 200 })
  publisher?: string;

  @Prop({ min: 1000, max: 9999 })
  publicationYear?: number;

  @Prop({ trim: true, default: 'English' })
  language: string;

  @Prop({ min: 1 })
  pageCount?: number;

  @Prop({ type: MediaAssetSchema })
  coverImage?: MediaAsset;

  @Prop({ type: [MediaAssetSchema], default: [] })
  media: MediaAsset[];

  @Prop({ default: false })
  rentalEnabled: boolean;

  @Prop({ default: false })
  saleEnabled: boolean;

  // Extra charge per rental on top of the subscription; usually 0
  @Prop({ ...kobo, default: 0 })
  rentalPriceKobo: number;

  @Prop({
    ...kobo,
    required: [
      function (this: Book) {
        return this.saleEnabled;
      },
      'salePriceKobo is required when saleEnabled is true',
    ],
  })
  salePriceKobo?: number;

  @Prop({ type: BookAvailabilitySchema, default: () => ({}) })
  availability: BookAvailability;

  @Prop({ type: String, enum: BookStatus, default: BookStatus.ACTIVE })
  status: BookStatus;

  createdAt: Date;
  updatedAt: Date;
}

export type BookDocument = HydratedDocument<Book>;
export const BookSchema = SchemaFactory.createForClass(Book);

BookSchema.index(
  { isbn: 1 },
  { unique: true, partialFilterExpression: { isbn: { $type: 'string' } } },
);

// Catalog search: GET /books?q=habits
BookSchema.index(
  { title: 'text', authorNames: 'text', subtitle: 'text', description: 'text' },
  {
    name: 'book_text_search',
    weights: { title: 10, authorNames: 6, subtitle: 3, description: 1 },
  },
);

// /books/rent and /books/sale listings, newest first
BookSchema.index({ status: 1, rentalEnabled: 1, createdAt: -1 });
BookSchema.index({ status: 1, saleEnabled: 1, createdAt: -1 });
BookSchema.index({ categoryIds: 1, status: 1 });
BookSchema.index({ authorIds: 1 });
