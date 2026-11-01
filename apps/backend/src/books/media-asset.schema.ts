import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

/**
 * A picture or video in object storage (S3). Only the object key lives in
 * MongoDB, never the file: the public URL is built from the key and the
 * storage/CDN base URL, so moving buckets or adding a CDN needs no migration.
 */
@Schema({ _id: true })
export class MediaAsset {
  @Prop({ type: String, enum: MediaType, required: true })
  type: MediaType;

  // e.g. "books/6560a1b2.../9f1c2e.webp"
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, min: 0 })
  sizeBytes: number;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  durationSeconds?: number;

  // Poster frame for videos, small preview for images
  @Prop()
  thumbnailKey?: string;

  @Prop({ trim: true, maxlength: 200 })
  caption?: string;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
