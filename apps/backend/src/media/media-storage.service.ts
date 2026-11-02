import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir, open, rm, stat } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Env } from '../config/env.validation';

export const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 15 * 60;
const UPLOAD_PREFIX = 'books/uploads';
// Only keys this service generated are ever accepted back from a client
const KEY_PATTERN = /^books\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export interface UploadTicket {
  key: string;
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface StoredImage {
  key: string;
  mimeType: ImageType;
  sizeBytes: number;
}

/** First bytes of each accepted format; the declared type must match. */
function sniffImageType(head: Buffer): ImageType | undefined {
  if (head.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  if (
    head
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    head.subarray(0, 4).toString('latin1') === 'RIFF' &&
    head.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return undefined;
}

/**
 * Book pictures. The browser uploads straight to storage with a short-lived
 * signed URL (request bodies through the load balancer are limited), then
 * the book is created with the returned keys and `confirmImage` checks each
 * file really is the image it claims to be.
 *
 * Storage is the S3 bucket behind the CDN when MEDIA_BUCKET is set (always in
 * production), otherwise a local folder served by the backend.
 */
@Injectable()
export class MediaStorageService {
  private readonly bucket?: string;
  private readonly cdnUrl?: string;
  private readonly localDir: string;
  private readonly signingKey: Buffer;
  private readonly s3?: S3Client;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('MEDIA_BUCKET', { infer: true });
    this.cdnUrl = config.get('CDN_URL', { infer: true })?.replace(/\/+$/, '');
    this.localDir = resolve(config.get('MEDIA_DIR', { infer: true }));
    this.signingKey = createHmac(
      'sha256',
      config.get('JWT_ACCESS_SECRET', { infer: true }),
    )
      .update('local-media-upload')
      .digest();
    if (this.bucket) this.s3 = new S3Client({});
  }

  get usesLocalStorage(): boolean {
    return !this.s3;
  }

  async createImageUpload(
    contentType: string,
    sizeBytes: number,
  ): Promise<UploadTicket> {
    if (!(contentType in IMAGE_TYPES)) {
      throw new BadRequestException('Use a JPEG, PNG or WebP picture');
    }
    if (sizeBytes > MAX_IMAGE_BYTES) {
      throw new PayloadTooLargeException('Pictures must be 10 MB or smaller');
    }
    const ext = IMAGE_TYPES[contentType as ImageType];
    const key = `${UPLOAD_PREFIX}/${randomUUID()}.${ext}`;
    const expiresAt = new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000);
    const headers = { 'Content-Type': contentType };

    if (this.s3) {
      // Type and exact size are part of the signature: S3 rejects any other
      const url = await getSignedUrl(
        this.s3,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType,
          ContentLength: sizeBytes,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
        {
          expiresIn: UPLOAD_TTL_SECONDS,
          signableHeaders: new Set(['content-type', 'content-length']),
        },
      );
      return { key, url, method: 'PUT', headers, expiresAt };
    }

    const token = this.signLocal(key, contentType, sizeBytes, expiresAt);
    const name = key.slice(UPLOAD_PREFIX.length + 1);
    return {
      key,
      url: `/api/media/local-uploads/${name}?size=${sizeBytes}&expires=${expiresAt.getTime()}&token=${token}`,
      method: 'PUT',
      headers,
      expiresAt,
    };
  }

  /**
   * Checks an uploaded file exists and starts with the bytes of the image
   * type it was uploaded as. Anything else is deleted and rejected.
   */
  async confirmImage(key: string): Promise<StoredImage> {
    if (!KEY_PATTERN.test(key)) {
      throw new BadRequestException('Unknown picture');
    }
    const expected = Object.entries(IMAGE_TYPES).find(([, ext]) =>
      key.endsWith(`.${ext}`),
    )![0] as ImageType;

    let head: Buffer;
    let sizeBytes: number;
    try {
      ({ head, sizeBytes } = await this.readHead(key));
    } catch {
      throw new BadRequestException(
        'A picture was not uploaded. Please add it again.',
      );
    }

    if (sniffImageType(head) !== expected || sizeBytes > MAX_IMAGE_BYTES) {
      await this.remove(key);
      throw new BadRequestException(
        'A file is not a valid JPEG, PNG or WebP picture',
      );
    }
    return { key, mimeType: expected, sizeBytes };
  }

  publicUrl(key: string): string {
    return this.cdnUrl ? `${this.cdnUrl}/${key}` : `/api/media/files/${key}`;
  }

  // ---- Local storage (development and tests) ------------------------------

  /** Stores a local upload after checking its signature and size. */
  async saveLocalUpload(
    name: string,
    query: { size?: string; expires?: string; token?: string },
    contentType: string | undefined,
    contentLength: string | undefined,
    body: Readable,
  ): Promise<void> {
    const key = `${UPLOAD_PREFIX}/${name}`;
    const size = Number(query.size);
    const expiresAt = new Date(Number(query.expires));
    const valid =
      KEY_PATTERN.test(key) &&
      !!contentType &&
      Number.isInteger(size) &&
      expiresAt.getTime() > Date.now() &&
      this.tokenMatches(
        query.token ?? '',
        this.signLocal(key, contentType, size, expiresAt),
      );
    if (!valid) throw new BadRequestException('Upload link invalid or expired');
    // Answer before reading the body when the declared size is wrong
    if (contentLength !== undefined && Number(contentLength) > size) {
      throw new PayloadTooLargeException('File is larger than signed for');
    }
    if (contentLength !== undefined && Number(contentLength) !== size) {
      throw new BadRequestException('Upload size does not match');
    }

    const path = this.localPath(key);
    await mkdir(dirname(path), { recursive: true });

    let received = 0;
    body.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > size) body.destroy(new PayloadTooLargeException());
    });
    try {
      await pipeline(body, createWriteStream(path));
    } catch (error) {
      await rm(path, { force: true });
      throw error instanceof PayloadTooLargeException
        ? error
        : new BadRequestException('Upload failed');
    }
    if (received !== size) {
      await rm(path, { force: true });
      throw new BadRequestException('Upload size does not match');
    }
  }

  /** Absolute path of a local file, or undefined for an invalid key. */
  localPath(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new BadRequestException('Unknown file');
    return join(this.localDir, key);
  }

  private signLocal(
    key: string,
    contentType: string,
    size: number,
    expiresAt: Date,
  ): string {
    return createHmac('sha256', this.signingKey)
      .update(`${key}|${contentType}|${size}|${expiresAt.getTime()}`)
      .digest('base64url');
  }

  private tokenMatches(given: string, expected: string): boolean {
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async readHead(
    key: string,
  ): Promise<{ head: Buffer; sizeBytes: number }> {
    if (this.s3) {
      const meta = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const object = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: 'bytes=0-15',
        }),
      );
      const head = Buffer.from(await object.Body!.transformToByteArray());
      return { head, sizeBytes: meta.ContentLength ?? 0 };
    }

    const path = this.localPath(key);
    const { size } = await stat(path);
    const file = await open(path, 'r');
    try {
      const head = Buffer.alloc(16);
      await file.read(head, 0, 16, 0);
      return { head, sizeBytes: size };
    } finally {
      await file.close();
    }
  }

  private async remove(key: string): Promise<void> {
    if (this.s3) {
      await this.s3
        .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
        .catch(() => undefined);
      return;
    }
    await rm(this.localPath(key), { force: true });
  }
}
