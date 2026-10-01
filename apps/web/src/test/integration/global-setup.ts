import { createClient } from '@supabase/supabase-js';
import type { Database } from '@prapp/db-types';

const CHUNK_SIZE = 100;
const AUTH_DELETE_CONCURRENCY = 4;
const TEST_EMAIL_PATTERN = 't-%@example.test';
const TEST_DEVICE_PATTERN = 'dev-%';
const TEST_IP_PATTERN = 'ip-%';
const TEST_WEBHOOK_PATTERN = 'evt_%';

function chunks<T>(values: T[], size = CHUNK_SIZE) {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, i + size));
  }
  return result;
}

function assertLocalSupabase(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`Integration cleanup refused for non-local Supabase host: ${url.hostname}`);
  }
}

async function cleanupIntegrationData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Integration cleanup needs NEXT_PUBLIC_SUPABASE_URL and a Supabase secret key');
  }
  assertLocalSupabase(url);

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: profiles, error: profilesError } = await service
    .from('profiles')
    .select('id')
    .like('email', TEST_EMAIL_PATTERN);
  if (profilesError) throw profilesError;
  const userIds = profiles.map((profile) => profile.id);

  const orderIds = new Set<string>();
  const reportPaths = new Set<string>();
  const addOrders = (orders: { id: string; report_path: string | null }[] | null) => {
    for (const order of orders ?? []) {
      orderIds.add(order.id);
      if (order.report_path) reportPaths.add(order.report_path);
    }
  };

  const { data: snapshotOrders, error: snapshotOrdersError } = await service
    .from('orders')
    .select('id, report_path')
    .like('customer_email', TEST_EMAIL_PATTERN);
  if (snapshotOrdersError) throw snapshotOrdersError;
  addOrders(snapshotOrders);

  for (const userIdChunk of chunks(userIds)) {
    const { data, error } = await service
      .from('orders')
      .select('id, report_path')
      .in('user_id', userIdChunk);
    if (error) throw error;
    addOrders(data);
  }

  const orderIdList = [...orderIds];
  const orderImagePaths = new Set<string>();
  for (const orderIdChunk of chunks(orderIdList)) {
    const { data, error } = await service
      .from('order_images')
      .select('storage_path')
      .in('order_id', orderIdChunk);
    if (error) throw error;
    for (const image of data) orderImagePaths.add(image.storage_path);
  }

  const factCheckIds = new Set<string>();
  const factCheckUploads = new Set<string>();
  const factCheckShares = new Set<string>();
  const addFactChecks = (
    rows:
      | {
          id: string;
          image_path: string | null;
          share_image_path: string | null;
          pdf_path: string | null;
        }[]
      | null,
  ) => {
    for (const row of rows ?? []) {
      factCheckIds.add(row.id);
      if (row.image_path) factCheckUploads.add(row.image_path);
      if (row.share_image_path) factCheckShares.add(row.share_image_path);
      if (row.pdf_path) factCheckShares.add(row.pdf_path);
    }
  };

  const { data: guestFactChecks, error: guestFactChecksError } = await service
    .from('fact_checks')
    .select('id, image_path, share_image_path, pdf_path')
    .like('device_id', TEST_DEVICE_PATTERN);
  if (guestFactChecksError) throw guestFactChecksError;
  addFactChecks(guestFactChecks);

  for (const userIdChunk of chunks(userIds)) {
    const { data, error } = await service
      .from('fact_checks')
      .select('id, image_path, share_image_path, pdf_path')
      .in('user_id', userIdChunk);
    if (error) throw error;
    addFactChecks(data);
  }

  const removeStorage = async (bucket: string, paths: Set<string>) => {
    for (const pathChunk of chunks([...paths])) {
      const { error } = await service.storage.from(bucket).remove(pathChunk);
      if (error) throw error;
    }
  };
  await removeStorage('order-images', orderImagePaths);
  await removeStorage('reports', reportPaths);
  await removeStorage('fact-check-uploads', factCheckUploads);
  await removeStorage('fact-check-share', factCheckShares);

  for (const factCheckIdChunk of chunks([...factCheckIds])) {
    const { error } = await service.from('fact_checks').delete().in('id', factCheckIdChunk);
    if (error) throw error;
  }

  for (const orderIdChunk of chunks(orderIdList)) {
    const refunds = await service.from('refunds').delete().in('order_id', orderIdChunk);
    if (refunds.error) throw refunds.error;
    const payments = await service.from('payments').delete().in('order_id', orderIdChunk);
    if (payments.error) throw payments.error;
    const intents = await service.from('payment_intents').delete().in('order_id', orderIdChunk);
    if (intents.error) throw intents.error;
    const orders = await service.from('orders').delete().in('id', orderIdChunk);
    if (orders.error) throw orders.error;
  }

  // Staff notifications can belong to a real local admin even when the order was
  // created by a test user. Once a test order is gone, remove only notifications
  // whose referenced order is also gone; notifications for real orders survive.
  const notifications: {
    id: string;
    data: Database['public']['Tables']['notifications']['Row']['data'];
  }[] = [];
  for (let from = 0; ; from += 1_000) {
    const { data, error } = await service
      .from('notifications')
      .select('id, data')
      .range(from, from + 999);
    if (error) throw error;
    notifications.push(...data);
    if (data.length < 1_000) break;
  }
  const referencedOrderIds = new Set<string>();
  const notificationOrderIds = new Map<string, string>();
  for (const notification of notifications) {
    const data = notification.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    const orderId = data.order_id;
    if (typeof orderId !== 'string') continue;
    notificationOrderIds.set(notification.id, orderId);
    referencedOrderIds.add(orderId);
  }
  const existingOrderIds = new Set<string>();
  for (const referencedOrderIdChunk of chunks([...referencedOrderIds])) {
    const { data, error } = await service
      .from('orders')
      .select('id')
      .in('id', referencedOrderIdChunk);
    if (error) throw error;
    for (const order of data) existingOrderIds.add(order.id);
  }
  const orphanNotificationIds = [...notificationOrderIds]
    .filter(([, orderId]) => !existingOrderIds.has(orderId))
    .map(([notificationId]) => notificationId);
  for (const notificationIdChunk of chunks(orphanNotificationIds)) {
    const { error } = await service.from('notifications').delete().in('id', notificationIdChunk);
    if (error) throw error;
  }

  const testDeviceUsage = await service
    .from('usage_counters')
    .delete()
    .like('key', TEST_DEVICE_PATTERN);
  if (testDeviceUsage.error) throw testDeviceUsage.error;
  const testIpUsage = await service.from('usage_counters').delete().like('key', TEST_IP_PATTERN);
  if (testIpUsage.error) throw testIpUsage.error;
  for (const userIdChunk of chunks(userIds)) {
    const usage = await service.from('usage_counters').delete().in('key', userIdChunk);
    if (usage.error) throw usage.error;
  }

  const webhooks = await service
    .from('webhook_events')
    .delete()
    .like('event_id', TEST_WEBHOOK_PATTERN);
  if (webhooks.error) throw webhooks.error;

  const deleteTestUser = async (userId: string) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { error } = await service.auth.admin.deleteUser(userId);
      if (!error || error.message.toLowerCase().includes('not found')) return;
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  };

  for (const userIdChunk of chunks(userIds, AUTH_DELETE_CONCURRENCY)) {
    await Promise.all(userIdChunk.map(async (userId) => deleteTestUser(userId)));
  }
}

export default async function setup() {
  await cleanupIntegrationData();
  return cleanupIntegrationData;
}
