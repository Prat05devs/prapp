import { notFound, redirect } from 'next/navigation';
import { ApiError, fetchCatalogue, getOrder } from '@prapp/api-client';
import { EDITABLE_ORDER_STATUSES } from '@prapp/shared';
import { Page } from '@/components/ui';
import { paymentsMode } from '@/server/env';
import { requireCompleteUser } from '@/server/session';
import { createServerSupabase } from '@/server/supabase/server';
import { OrderEditor } from './order-editor';

export default async function EditOrderPage({ params }: PageProps<'/orders/[id]/edit'>) {
  const { id } = await params;
  const me = await requireCompleteUser(`/orders/${id}/edit`);
  const supabase = await createServerSupabase();
  const order = await getOrder(supabase, id).catch((e: unknown) => {
    if (e instanceof ApiError && e.code === 'order_not_found') notFound();
    throw e;
  });
  if (!(EDITABLE_ORDER_STATUSES as readonly string[]).includes(order.status)) {
    redirect(`/orders/${id}`);
  }
  const { packages } = await fetchCatalogue(supabase);

  return (
    <Page width="xl">
      <OrderEditor
        order={order}
        packages={packages}
        profileComplete={me.profileComplete}
        freeCheckout={paymentsMode() === 'free'}
        paymentLink={paymentsMode() === 'link'}
      />
    </Page>
  );
}
