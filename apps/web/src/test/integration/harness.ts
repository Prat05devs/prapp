import type { CheckoutResponse } from '@prapp/shared';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@prapp/db-types';
import { createDraft, uploadOrderImage } from '@prapp/api-client';
import { createServiceClient } from '@/server/supabase/service';

// Helpers for integration tests against the local Supabase (`supabase start`).

export const service = createServiceClient();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type TestUser = {
  id: string;
  email: string;
  db: ReturnType<typeof createClient<Database>>;
  accessToken: string;
};

/** Creates a confirmed user and returns a signed-in, RLS-scoped client. */
export async function createUser(
  opts: { name?: string; phone?: string | null; role?: 'user' | 'editor' | 'admin' } = {},
): Promise<TestUser> {
  const email = `t-${randomUUID().slice(0, 8)}@example.test`;
  const password = `pw-${randomUUID()}`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: opts.name ?? 'Test User' },
  });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  const phone = opts.phone === undefined ? '+919876543210' : opts.phone;
  const upd = await service
    .from('profiles')
    .update({ phone, role: opts.role ?? 'user' })
    .eq('id', id);
  if (upd.error) throw upd.error;

  const db = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id, email, db, accessToken: signIn.data.session.access_token };
}

export async function packageByCode(code: string) {
  const { data, error } = await service.from('packages').select('*').eq('code', code).single();
  if (error) throw error;
  return data;
}

const BODY = 'Dehradun, Uttarakhand. '.repeat(20);

/** A draft with one uploaded image and the declaration accepted: ready for checkout. */
export async function readyDraft(user: TestUser, packageCode = 'starter') {
  const pkg = await packageByCode(packageCode);
  const { id } = await createDraft(user.db, {
    packageId: pkg.id,
    headline: 'Local school wins the state science fair',
    body: BODY,
    instagramHandle: '@doon.times',
    featureConsent: false,
    declarationAccepted: true,
  });
  await uploadOrderImage(user.db, {
    userId: user.id,
    orderId: id,
    fileId: randomUUID(),
    data: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }),
    meta: { mimeType: 'image/jpeg', sizeBytes: 4, width: 10, height: 10, position: 1 },
  });
  return { orderId: id, pkg };
}

export async function orderRow(orderId: string) {
  const { data, error } = await service.from('orders').select('*').eq('id', orderId).single();
  if (error) throw error;
  return data;
}

export async function paymentsOf(orderId: string) {
  const { data } = await service
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at');
  return data ?? [];
}

export async function placementsOf(orderId: string) {
  const { data } = await service
    .from('order_placements')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at');
  return data ?? [];
}

export function checkoutFields(checkoutUrl: string) {
  return checkoutUrl.split('/pay/')[1]!;
}

/** Narrows a checkout response to the Razorpay branch (PAYMENTS_MODE=razorpay). */
export function razorpayCheckout(res: CheckoutResponse) {
  if (res.confirmed) throw new Error('expected a Razorpay checkout, got a free confirmation');
  return res;
}
