import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ trim: true, maxlength: 1000 })
  description?: string;

  // Optional nesting: Fiction > Thriller
  @Prop({ type: Types.ObjectId, ref: 'Category', index: true })
  parentId?: Types.ObjectId;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);
