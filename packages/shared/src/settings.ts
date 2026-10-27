// Public app_settings (admin-editable, LLD §13) as the site, the app and the PDF reports show them.

/** Support contact details, read from these app_settings keys; never hard-coded. */
export interface SupportContacts {
  phone?: string;
  email?: string;
  whatsapp?: string;
  hours?: string;
}

const SUPPORT_KEYS: Record<keyof SupportContacts, string> = {
  phone: 'support.phone',
  email: 'support.email',
  whatsapp: 'support.whatsapp',
  hours: 'support.hours',
};

/** A setting worth showing: text that isn't blank or the seed placeholder (+91XXXXXXXXXX). */
export function settingText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() && !value.includes('XXXX') ? value : undefined;
}

/** The support contacts that are actually set, from the public settings map. */
export function supportContacts(
  settings: Record<string, unknown> | null | undefined,
): SupportContacts {
  const out: SupportContacts = {};
  for (const [field, key] of Object.entries(SUPPORT_KEYS) as [keyof SupportContacts, string][]) {
    const value = settingText(settings?.[key]);
    if (value) out[field] = value;
  }
  return out;
}
