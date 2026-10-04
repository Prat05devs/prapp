import { customerPasswordSchema } from '@prapp/shared';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionButton, ErrorText, Field, PageHeader, Screen } from '@/components/ui';
import { startRecoverySession } from '@/lib/auth-link';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

/**
 * newsvio://reset-password: where the "forgot password" email lands. The link signs the user in;
 * they then choose a new password, after which the root guard sends them on.
 */
export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();
  const { session } = useAuth();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!url) return;
    void startRecoverySession(url).then((err) => {
      if (err) setError(err);
      else setReady(true);
    });
  }, [url]);

  async function save() {
    const parsed = customerPasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Choose a stronger password');
      return;
    }
    setPending(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password: parsed.data });
    setPending(false);
    if (err) setError(err.message);
    else router.replace('/');
  }

  return (
    <Screen>
      <PageHeader title="Set a new password" lede="Choose a password you'll use to log in." />
      {ready ? (
        <>
          <Field
            label="New password"
            hint="At least 8 characters."
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <ActionButton title="Save password" variant="accent" loading={pending} onPress={save} />
        </>
      ) : null}
      <ErrorText>{error}</ErrorText>
      {!ready && error ? (
        <ActionButton
          title={session ? 'Continue' : 'Back to log in'}
          variant="outline"
          onPress={() => router.replace(session ? '/' : '/sign-in')}
        />
      ) : null}
    </Screen>
  );
}
