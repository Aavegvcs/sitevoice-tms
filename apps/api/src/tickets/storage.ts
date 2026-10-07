import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Readable } from 'stream';

/**
 * Attachment bytes live in S3 (S3_BUCKET, S3_REGION; credentials come from the AWS default chain,
 * e.g. an EC2 instance role). Without S3_BUCKET it falls back to local disk (UPLOAD_DIR) for
 * development and tests. Files are only ever served through the API, so ticket permissions apply.
 */
@Injectable()
export class AttachmentStorage {
  private readonly log = new Logger(AttachmentStorage.name);
  private readonly bucket = process.env.S3_BUCKET;
  private readonly prefix = (process.env.S3_PREFIX ?? 'attachments/').replace(/^\/+/, '');
  private readonly dir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
  private readonly s3 = this.bucket
    ? new S3Client({ region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1' })
    : null;

  /** Stores an upload under a random server-side name (the client-supplied name is never a key or path). */
  async put(file: Express.Multer.File): Promise<string> {
    const ext = extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
    const name = `${randomUUID()}${ext}`;
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.prefix + name,
          Body: file.buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: 'AES256',
        }),
      );
    } else {
      if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
      await writeFile(join(this.dir, name), file.buffer);
    }
    return name;
  }

  /** Returns a stream of the stored file, or null if it no longer exists. */
  async get(name: string): Promise<Readable | null> {
    if (this.s3) {
      try {
        const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.prefix + name }));
        return res.Body as Readable;
      } catch (e) {
        if ((e as { name?: string }).name === 'NoSuchKey') return null;
        throw e;
      }
    }
    const path = join(this.dir, name);
    return existsSync(path) ? createReadStream(path) : null;
  }

  /** Best-effort cleanup of files whose database row was never written. */
  async remove(names: string[]) {
    if (!names.length) return;
    try {
      if (this.s3) {
        await this.s3.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: names.map((n) => ({ Key: this.prefix + n })), Quiet: true },
          }),
        );
      } else {
        await Promise.all(names.map((n) => unlink(join(this.dir, n)).catch(() => undefined)));
      }
    } catch (e) {
      this.log.warn(`Could not remove orphaned uploads: ${(e as Error).message}`);
    }
  }
}
