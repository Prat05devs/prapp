import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, type CustomerOrder, type OrderImage } from '@prapp/api-client';
import {
  EDITABLE_ORDER_STATUSES,
  LIMITS,
  checkoutReadiness,
  orderContentSchema,
  type OrderContentInput,
  type OrderStatus,
} from '@prapp/shared';
import { api } from '@/lib/api';
import { pickImage } from '@/lib/images';
import { useAuth } from '@/providers/auth-provider';

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'invalid' | 'error';
export type FieldErrors = Partial<Record<keyof OrderContentInput, string>>;

function firstErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): FieldErrors {
  const out: FieldErrors = {};
  for (const i of error.issues) {
    const k = i.path[0] as keyof OrderContentInput | undefined;
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

const message = (e: unknown, fallback: string) =>
  e instanceof ApiError || e instanceof Error ? e.message : fallback;

/** Publish tab: validate and create the draft, then continue in the editor. */
export function useCreateDraft() {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  async function create(input: OrderContentInput) {
    const parsed = orderContentSchema.safeParse(input);
    if (!parsed.success) return setFieldErrors(firstErrors(parsed.error));
    setFieldErrors({});
    setError(null);
    setPending(true);
    try {
      const { id } = await api.orders.create(input);
      router.push({ pathname: '/orders/[id]/edit', params: { id } });
    } catch (e) {
      setError(message(e, 'Could not save your story.'));
    } finally {
      setPending(false);
    }
  }
  return { pending, fieldErrors, error, create };
}

/** Draft / changes-requested editor: autosave, images, review (LLD §9.3). */
export function useOrderEditor(initial: CustomerOrder) {
  const { me } = useAuth();
  const [content, setContent] = useState<OrderContentInput>(() => ({
    packageId: initial.packageId,
    headline: initial.headline,
    body: initial.body,
    instagramHandle: initial.instagramHandle ?? '',
    featureConsent: initial.featureConsent,
    declarationAccepted: initial.declarationAcceptedAt !== null,
  }));
  const [images, setImages] = useState<OrderImage[]>(initial.images);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [imageBusy, setImageBusy] = useState<1 | 2 | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const status = initial.status as OrderStatus;
  const editable = (EDITABLE_ORDER_STATUSES as readonly string[]).includes(status);

  function update(patch: Partial<OrderContentInput>) {
    if (!editable) return;
    const next = { ...content, ...patch };
    setContent(next);
    clearTimeout(timer.current);
    const parsed = orderContentSchema.safeParse(next);
    if (!parsed.success) {
      setFieldErrors(firstErrors(parsed.error));
      setSaveState('invalid');
      return;
    }
    setFieldErrors({});
    setSaveState('unsaved');
    timer.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        await api.orders.update(initial.id, next);
        setSaveState('saved');
      } catch (e) {
        setSaveState('error');
        setError(message(e, 'Could not save.'));
      }
    }, 800);
  }

  async function addImage(position: 1 | 2) {
    if (!editable || !me) return;
    setError(null);
    try {
      const picked = await pickImage();
      if (!picked) return;
      setImageBusy(position);
      const existing = images.find((i) => i.position === position);
      // Multipart upload through the API; replacing removes the old image on the server.
      const { image: row } = await api.orders.uploadImage(
        initial.id,
        {
          uri: picked.uri,
          name: picked.fileName ?? `image-${position}.jpg`,
          type: picked.mimeType,
        },
        {
          mimeType: picked.mimeType,
          sizeBytes: picked.sizeBytes,
          width: picked.width,
          height: picked.height,
          position,
          originalFilename: picked.fileName?.slice(0, LIMITS.originalFilenameMax) ?? undefined,
        },
        existing?.id,
      );
      setImages((l) =>
        [...l.filter((i) => i.position !== position), row].sort((a, b) => a.position - b.position),
      );
    } catch (e) {
      setError(message(e, 'Could not upload the image.'));
    } finally {
      setImageBusy(null);
    }
  }

  async function removeImage(image: OrderImage) {
    setImageBusy(image.position as 1 | 2);
    try {
      await api.orders.removeImage(initial.id, image.id);
      setImages((l) => l.filter((i) => i.id !== image.id));
    } catch (e) {
      setError(message(e, 'Could not remove the image.'));
    } finally {
      setImageBusy(null);
    }
  }

  async function run(fn: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(message(e, fallback));
    } finally {
      setBusy(false);
    }
  }

  const discard = () =>
    run(async () => {
      // The server deletes a draft, or cancels an order whose checkout started.
      await api.orders.discard(initial.id);
      router.replace('/orders');
    }, 'Could not discard this draft.');

  const resubmit = () =>
    run(async () => {
      clearTimeout(timer.current);
      await api.orders.resubmit(initial.id, content);
      router.replace({ pathname: '/orders/[id]', params: { id: initial.id } });
    }, 'Could not resubmit.');

  const readiness = useMemo(
    () =>
      checkoutReadiness({
        content,
        imageCount: images.length,
        profileComplete: Boolean(me?.profileComplete),
      }),
    [content, images.length, me?.profileComplete],
  );

  return {
    status,
    editable,
    packageLocked: status === 'changes_requested',
    content,
    update,
    saveState,
    fieldErrors,
    images,
    imageBusy,
    addImage,
    removeImage,
    readiness,
    busy,
    error,
    discard,
    resubmit,
  };
}
