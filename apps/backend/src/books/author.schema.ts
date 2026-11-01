import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Author {
  @Prop({ required: true, trim: true, maxlength: 200 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ trim: true, maxlength: 5000 })
  bio?: string;

  // Object storage key, see MediaAsset
  @Prop()
  photoKey?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type AuthorDocument = HydratedDocument<Author>;
export const AuthorSchema = SchemaFactory.createForClass(Author);
