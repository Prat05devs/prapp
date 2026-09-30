import {
  isAllowedImageType,
  orderContentSchema,
  orderImageMetaSchema,
  orderImagePath,
  toOrderRow,
  type OrderContentInput,
  type OrderImageMeta,
} from '@prapp/shared';
import { camelize } from '../case';
import { ApiError } from '../client';
import { check, toApiError, unwrap, type Db } from './db';

export const ORDER_IMAGES_BUCKET = 'order-images';

/** Columns a customer sees (all readable under RLS; money/state columns are read-only). */
const ORDER_COLUMNS =
  'id, order_number, status, package_id, headline, body, instagram_handle, feature_consent, declaration_accepted_at, package_snapshot, amount_minor, currency, current_intent_id, paid_at, deadline_at, changes_requested_reason, rejection_reason, published_at, report_status, report_version, created_at, updated_at';

const IMAGE_COLUMNS =
  'id, order_id, storage_path, mime_type, size_bytes, width, height, position, original_filename, created_at';

export async function listMyOrders(db: Db, userId: string) {
  const res = await db
    .from('orders')
    .select(
      'id, order_number, status, headline, package_id, amount_minor, currency, deadline_at, published_at, created_at, updated_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  check(res);
  return camelize(res.data ?? []);
}
export type OrderListItem = Awaited<ReturnType<typeof listMyOrders>>[number];

export async function getOrder(db: Db, orderId: string) {
  const [order, images] = await Promise.all([
    db.from('orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle(),
    db.from('order_images').select(IMAGE_COLUMNS).eq('order_id', orderId).order('position'),
  ]);
  const row = unwrap(order);
  check(images);
  return { ...camelize(row), images: camelize(images.data ?? []) };
}
export type CustomerOrder = Awaited<ReturnType<typeof getOrder>>;
export type OrderImage = CustomerOrder['images'][number];

/** Step 1 of LLD §9.3: insert the draft (RLS + trigger check profile, daily limit, package). */
export async function createDraft(db: Db, input: OrderContentInput) {
  const content = orderContentSchema.parse(input);
  const res = await db
    .from('orders')
    .insert(toOrderRow(content))
    .select('id, order_number')
    .single();
  return camelize(unwrap(res));
}

/** Autosave (debounced by the caller). Only content columns are granted to customers. */
export async function updateDraft(db: Db, orderId: string, input: OrderContentInput) {
  const content = orderContentSchema.parse(input);
  const res = await db
    .from('orders')
    .update(toOrderRow(content))
    .eq('id', orderId)
    .select('id')
    .maybeSingle();
  if (res.error) throw toApiError(res.error);
  if (!res.data) throw new ApiError('order_locked', 409, "This order can't be edited right now.");
}

/** Deletes a draft that never reached checkout: images first, then the row. */
export async function deleteDraft(db: Db, orderId: string) {
  const images = await db.from('order_images').select('storage_path').eq('order_id', orderId);
  check(images);
  const paths = (images.data ?? []).map((i) => i.storage_path);
  if (paths.length) check(await db.storage.from(ORDER_IMAGES_BUCKET).remove(paths));
  const res = await db.from('orders').delete().eq('id', orderId).select('id');
  check(res);
  if (!res.data?.length)
    throw new ApiError('order_locked', 409, "This order can't be edited right now.");
}

export async function cancelOrder(db: Db, orderId: string) {
  check(await db.rpc('user_cancel_order', { p_order_id: orderId }));
}

export async function resubmitOrder(db: Db, orderId: string) {
  check(await db.rpc('user_resubmit_order', { p_order_id: orderId }));
}

export interface UploadImageInput {
  userId: string;
  orderId: string;
  /** random id for the file name (crypto.randomUUID()) */
  fileId: string;
  /** already compressed/re-encoded on the device (EXIF stripped) */
  data: Blob | ArrayBuffer;
  meta: OrderImageMeta;
}

/**
 * Step 2 of LLD §9.3: upload to Storage, then insert order_images.
 * If the row insert fails the uploaded object is deleted again.
 */
export async function uploadOrderImage(db: Db, input: UploadImageInput) {
  const meta = orderImageMetaSchema.parse(input.meta);
  if (!isAllowedImageType(meta.mimeType))
    throw new ApiError('validation_failed', 422, 'Unsupported image type');
  const path = orderImagePath(input.userId, input.orderId, input.fileId, meta.mimeType);
  const bucket = db.storage.from(ORDER_IMAGES_BUCKET);

  const up = await bucket.upload(path, input.data, { contentType: meta.mimeType, upsert: false });
  if (up.error) throw toApiError({ code: null, message: up.error.message });

  const row = await db
    .from('order_images')
    .insert({
      order_id: input.orderId,
      storage_path: path,
      mime_type: meta.mimeType,
      size_bytes: meta.sizeBytes,
      width: meta.width ?? null,
      height: meta.height ?? null,
      position: meta.position,
      original_filename: meta.originalFilename ?? null,
    })
    .select(IMAGE_COLUMNS)
    .single();
  if (row.error) {
    await bucket.remove([path]);
    throw toApiError(row.error);
  }
  return camelize(row.data);
}

/** Step 3 of LLD §9.3: remove the row, then the object. */
export async function removeOrderImage(db: Db, image: { id: string; storagePath: string }) {
  check(await db.from('order_images').delete().eq('id', image.id));
  check(await db.storage.from(ORDER_IMAGES_BUCKET).remove([image.storagePath]));
}

/** Short-lived URLs for thumbnails (private bucket, LLD §15: ≤ 1 h). */
export async function signedImageUrls(
  db: Db,
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const res = await db.storage.from(ORDER_IMAGES_BUCKET).createSignedUrls(paths, expiresIn);
  if (res.error) throw toApiError({ message: res.error.message });
  const urls: Record<string, string> = {};
  for (const r of res.data ?? []) if (r.path && r.signedUrl) urls[r.path] = r.signedUrl;
  return urls;
}
