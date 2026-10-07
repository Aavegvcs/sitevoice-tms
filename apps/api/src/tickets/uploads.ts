import { memoryStorage } from 'multer';

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

/** Multer decodes names as latin1; browsers send UTF-8. */
export function decodeName(name: string) {
  return Buffer.from(name, 'latin1').toString('utf8');
}

// Files are buffered in memory (capped by the limits) and handed to AttachmentStorage by the service,
// so nothing is written anywhere until the request has passed validation and permission checks.
export const uploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
};
