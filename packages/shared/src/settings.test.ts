import { describe, expect, it } from 'vitest';
import { settingText, supportContacts } from './settings.ts';

describe('settingText', () => {
  it('keeps real values', () => expect(settingText('+91 98765 43210')).toBe('+91 98765 43210'));
  it('drops blanks, non-strings and the seed placeholder', () => {
    expect(settingText('  ')).toBeUndefined();
    expect(settingText(42)).toBeUndefined();
    expect(settingText('+91XXXXXXXXXX')).toBeUndefined();
  });
});

describe('supportContacts', () => {
  it('maps the support.* settings and leaves out unset ones', () => {
    expect(
      supportContacts({
        'support.phone': '+91XXXXXXXXXX',
        'support.email': 'help@newsvio.in',
        'support.hours': '10am–7pm',
      }),
    ).toEqual({ email: 'help@newsvio.in', hours: '10am–7pm' });
  });
  it('handles missing settings', () => expect(supportContacts(undefined)).toEqual({}));
});
