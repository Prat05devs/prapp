'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_PHONE_COUNTRY, phoneCountries } from '@prapp/shared';
import { Icon } from '@/components/icon';
import { Button, ErrorText, Field, Input, NativeSelect, NativeSelectOption } from '@/components/ui';
import { useCompleteProfile } from '@/hooks/use-complete-profile';

export function CompleteProfileForm({
  userId,
  initialName,
  next,
}: {
  userId: string;
  initialName: string;
  next: string;
}) {
  const { pending, fieldErrors, error, submit } = useCompleteProfile(userId, next);
  const countries = useMemo(() => phoneCountries(), []);
  const [fullName, setFullName] = useState(initialName);
  const [country, setCountry] = useState<string>(DEFAULT_PHONE_COUNTRY);
  const [phone, setPhone] = useState('');

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({ fullName, country, phone });
      }}
    >
      <Field label="Full name" error={fieldErrors.fullName}>
        <Input
          autoComplete="name"
          value={fullName}
          maxLength={100}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </Field>
      <Field label="Phone number" error={fieldErrors.phone ?? fieldErrors.country}>
        <div className="flex gap-2">
          <NativeSelect
            aria-label="Country code"
            className="shrink-0 font-mono text-code"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {countries.map((c) => (
              <NativeSelectOption key={c.code} value={c.code}>
                {c.code} +{c.callingCode}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            type="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="accent" size="lg" disabled={pending}>
        Continue <Icon name="arrow_forward" />
      </Button>
    </form>
  );
}
