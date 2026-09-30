import imageCompression from 'browser-image-compression';
import { LIMITS, isAllowedImageType, type ImageMimeType } from '@prapp/shared';

export interface PreparedImage {
  file: File;
  mimeType: ImageMimeType;
  width: number;
  height: number;
  originalFilename: string;
}

/**
 * LLD §9.2: resize to max 2000 px on the long edge, re-encode as JPEG q≈0.85.
 * Re-encoding through a canvas strips EXIF (incl. location).
 */
export async function prepareImage(original: File): Promise<PreparedImage> {
  if (!isAllowedImageType(original.type)) {
    throw new Error('Use a JPG, PNG or WebP image.');
  }
  const file = await imageCompression(original, {
    maxWidthOrHeight: LIMITS.imageMaxEdgePx,
    initialQuality: LIMITS.imageJpegQuality,
    fileType: 'image/jpeg',
    maxSizeMB: LIMITS.imageMaxBytes / (1024 * 1024),
    preserveExif: false,
    useWebWorker: true,
  });
  if (file.size > LIMITS.imageMaxBytes) throw new Error('Image must be 5 MB or smaller.');
  const bitmap = await createImageBitmap(file);
  const prepared = {
    file,
    mimeType: 'image/jpeg' as const,
    width: bitmap.width,
    height: bitmap.height,
    originalFilename: original.name.slice(0, LIMITS.originalFilenameMax),
  };
  bitmap.close();
  return prepared;
}
