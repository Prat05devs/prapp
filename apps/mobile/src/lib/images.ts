import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LIMITS } from '@prapp/shared';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: 'image/jpeg';
  fileName: string | null;
  base64?: string;
}

/**
 * Pick one photo, resize to max 2000 px on the long edge and re-encode as JPEG q≈0.85.
 * Re-encoding strips EXIF (incl. location) before anything is uploaded (LLD §9.2, §15).
 */
export async function pickImage(opts: { base64?: boolean } = {}): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Allow photo access in Settings to add an image.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];

  const longEdge = Math.max(asset.width, asset.height);
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (longEdge > LIMITS.imageMaxEdgePx) {
    ctx.resize(
      asset.width >= asset.height
        ? { width: LIMITS.imageMaxEdgePx }
        : { height: LIMITS.imageMaxEdgePx },
    );
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: LIMITS.imageJpegQuality,
    base64: opts.base64 ?? false,
  });
  const sizeBytes = new File(saved.uri).size ?? 0;
  if (sizeBytes > LIMITS.imageMaxBytes) throw new Error('Image must be 5 MB or smaller.');
  return {
    uri: saved.uri,
    width: saved.width,
    height: saved.height,
    sizeBytes,
    mimeType: 'image/jpeg',
    fileName: asset.fileName ?? null,
    base64: saved.base64,
  };
}

export async function readBytes(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
