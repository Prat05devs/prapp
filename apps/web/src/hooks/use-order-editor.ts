'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  cancelOrder,
  deleteDraft,
  removeOrderImage,
  resubmitOrder,
  updateDraft,
  uploadOrderImage,
  type CustomerOrder,
  type OrderImage,
} from '@prapp/api-client';
import {
  EDITABLE_ORDER_STATUSES,
  LIMITS,
  checkoutReadiness,
  orderContentSchema,
  type OrderContentInput,
  type OrderStatus,
} from '@prapp/shared';
import { prepareImage } from '@/lib/images';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { fieldErrorsFrom, type OrderFieldErrors } from '@/lib/form-errors';
import { useDebouncedCallback } from './use-debounced-callback';

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'invalid' | 'error';

function contentFrom(order: CustomerOrder): OrderContentInput {
  return {
    packageId: order.packageId,
    headline: order.headline,
    body: order.body,
    instagramHandle: order.instagramHandle ?? '',
    featureConsent: order.featureConsent,
    declarationAccepted: order.declarationAcceptedAt !== null,
  };
}

function message(e: unknown, fallback: string) {
  return e instanceof ApiError || e instanceof Error ? e.message : fallback;
}

/**
 * Edit a draft (or a changes_requested order): autosave, images, review.
 * All writes go straight to Supabase under RLS; triggers enforce the rules (LLD §9.3).
 */
export function useOrderEditor(initial: CustomerOrder, userId: string, profileComplete: boolean) {
  const router = useRouter();
  const [content, setContent] = useState<OrderContentInput>(() => contentFrom(initial));
  const [images, setImages] = useState<OrderImage[]>(initial.images);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [imageBusy, setImageBusy] = useState<1 | 2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const status = initial.status as OrderStatus;
  const editable = (EDITABLE_ORDER_STATUSES as readonly string[]).includes(status);
  const packageLocked = status === 'changes_requested';

  const autosave = useDebouncedCallback(async (next: OrderContentInput) => {
    setSaveState('saving');
    try {
      await updateDraft(createBrowserSupabase(), initial.id, next);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      setError(message(e, 'Could not save your changes.'));
    }
  }, 800);

  function update(patch: Partial<OrderContentInput>) {
    if (!editable) return;
    const next = { ...content, ...patch };
    setContent(next);
    setError(null);
    const parsed = orderContentSchema.safeParse(next);
    if (!parsed.success) {
      // Invalid content can't be stored (DB CHECKs); keep it locally until it is valid.
      setFieldErrors(fieldErrorsFrom(parsed.error));
      setSaveState('invalid');
      autosave.cancel();
      return;
    }
    setFieldErrors({});
    setSaveState('unsaved');
    autosave.run(next);
  }

  async function addImage(file: File, position: 1 | 2) {
    if (!editable) return;
    setImageBusy(position);
    setError(null);
    try {
      const prepared = await prepareImage(file);
      const db = createBrowserSupabase();
      const existing = images.find((i) => i.position === position);
      if (existing) {
        await removeOrderImage(db, existing); // replace = delete row + object, then upload
        setImages((list) => list.filter((i) => i.id !== existing.id));
      }
      const row = await uploadOrderImage(db, {
        userId,
        orderId: initial.id,
        fileId: crypto.randomUUID(),
        data: prepared.file,
        meta: {
          mimeType: prepared.mimeType,
          sizeBytes: prepared.file.size,
          width: prepared.width,
          height: prepared.height,
          position,
          originalFilename: prepared.originalFilename,
        },
      });
      setImages((list) =>
        [...list.filter((i) => i.position !== position), row].sort(
          (a, b) => a.position - b.position,
        ),
      );
      router.refresh();
    } catch (e) {
      setError(message(e, 'Could not upload the image.'));
    } finally {
      setImageBusy(null);
    }
  }

  async function removeImage(image: OrderImage) {
    if (!editable) return;
    setImageBusy(image.position as 1 | 2);
    setError(null);
    try {
      await removeOrderImage(createBrowserSupabase(), image);
      setImages((list) => list.filter((i) => i.id !== image.id));
    } catch (e) {
      setError(message(e, 'Could not remove the image.'));
    } finally {
      setImageBusy(null);
    }
  }

  async function run(action: () => Promise<void>, after: () => void, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      after();
    } catch (e) {
      setError(message(e, fallback));
    } finally {
      setBusy(false);
    }
  }

  const discardDraft = () =>
    run(
      () =>
        initial.currentIntentId
          ? cancelOrder(createBrowserSupabase(), initial.id) // was checked out once: keep the record
          : deleteDraft(createBrowserSupabase(), initial.id),
      () => {
        router.replace('/orders');
        router.refresh();
      },
      'Could not discard this draft.',
    );

  /** changes_requested → paid with a fresh deadline (user_resubmit_order). */
  const resubmit = () =>
    run(
      async () => {
        autosave.cancel();
        await updateDraft(createBrowserSupabase(), initial.id, content);
        await resubmitOrder(createBrowserSupabase(), initial.id);
      },
      () => {
        router.replace(`/orders/${initial.id}`);
        router.refresh();
      },
      'Could not resubmit.',
    );

  const readiness = useMemo(
    () => checkoutReadiness({ content, imageCount: images.length, profileComplete }),
    [content, images.length, profileComplete],
  );

  return {
    status,
    editable,
    packageLocked,
    content,
    update,
    saveState,
    fieldErrors,
    images,
    imageSlots: Array.from({ length: LIMITS.imagesMax }, (_, i) => (i + 1) as 1 | 2),
    imageBusy,
    addImage,
    removeImage,
    readiness,
    busy,
    error,
    discardDraft,
    resubmit,
  };
}
