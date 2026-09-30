const KEY = 'prapp_device_id';

/** Stable random id for guest fact checks (LLD §11.1). Not a tracking id: never sent elsewhere. */
export function deviceId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[A-Za-z0-9_-]{8,100}$/.test(existing)) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}
