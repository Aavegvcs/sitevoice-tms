import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlink } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Observable, catchError, throwError } from 'rxjs';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 10;

/** Only these raster formats are ever displayed inline; everything else downloads. */
export const INLINE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Multer decodes names as latin1; browsers send UTF-8. */
export function decodeName(name: string) {
  return Buffer.from(name, 'latin1').toString('utf8');
}

export const uploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir();
      cb(null, UPLOAD_DIR);
    },
    // Random server-side names: the client-supplied name is never used as a path.
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
};

export function removeFiles(files: { path: string }[] | undefined) {
  for (const f of files ?? []) unlink(f.path, () => undefined);
}

/** Deletes already-saved uploads when validation or the handler fails, so nothing is orphaned. */
@Injectable()
export class CleanupUploadsOnError implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      catchError((err) => {
        removeFiles(req.files);
        return throwError(() => err);
      }),
    );
  }
}
