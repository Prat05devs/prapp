import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  ActionButton,
  ErrorText,
  Field,
  Icon,
  PageHeader,
  Panel,
  Screen,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/components/ui';
import { usePasswordAuth, type AuthMode } from '@/hooks/use-password-auth';
import { GoogleG } from '@/components/google-g';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';
import { SIGN_IN_REASONS, type SignInReason } from '@/lib/sign-in-prompt';

/**
 * Sign in / create account, opened as a modal from wherever an account is needed. It closes on
 * its own when the session appears (root layout guard), back to the screen underneath.
 */
export default function SignInScreen() {
  const params = useLocalSearchParams<{ mode?: string; reason?: string }>();
  const reason =
    params.reason && params.reason in SIGN_IN_REASONS
      ? SIGN_IN_REASONS[params.reason as SignInReason]
      : null;
  const google = useGoogleSignIn();
  const auth = usePasswordAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>(params.mode === 'signup' ? 'signup' : 'login');
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <Screen>
      <View className="flex-row justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-subtle"
        >
          <Icon as={X} size={22} className="text-ink" />
        </Pressable>
      </View>
      <PageHeader
        title={mode === 'signup' ? 'Create your account' : 'Log in to NewsVio'}
        lede={
          reason ?? 'Save your fact checks, publish your story and track your orders in one place.'
        }
      />

      {auth.confirmEmail ? (
        <ConfirmCode auth={auth} />
      ) : (
        <Panel tone="subtle">
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as AuthMode);
              setForgot(false);
              setSent(false);
              auth.setError(null);
            }}
          >
            <TabsList className="mr-0 w-full">
              <TabsTrigger value="login" className="flex-1">
                <Text>Log in</Text>
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                <Text>Create account</Text>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          {forgot ? (
            <>
              <ActionButton
                title="Email me a reset link"
                variant="accent"
                icon={ArrowRight}
                loading={auth.pending}
                onPress={async () => setSent(await auth.sendReset(email))}
              />
              {sent ? (
                <Text variant="muted">
                  If an account uses this email, a reset link is on its way. Open it on this phone.
                </Text>
              ) : null}
              <ActionButton
                title="Back to log in"
                variant="outline"
                onPress={() => {
                  setForgot(false);
                  setSent(false);
                  auth.setError(null);
                }}
              />
            </>
          ) : (
            <>
              <Field
                label="Password"
                hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              />
              <ActionButton
                title={mode === 'login' ? 'Log in' : 'Create account'}
                variant="accent"
                icon={ArrowRight}
                loading={auth.pending}
                onPress={() => void auth.submit(mode, email, password)}
              />
              {mode === 'login' ? (
                <ActionButton
                  title="Forgot password?"
                  variant="outline"
                  onPress={() => {
                    setForgot(true);
                    auth.setError(null);
                  }}
                />
              ) : null}
            </>
          )}
          <ErrorText>{auth.error}</ErrorText>
        </Panel>
      )}

      {google.available ? (
        <>
          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Text variant="muted">or</Text>
            <Separator className="flex-1" />
          </View>
          <ActionButton
            title="Continue with Google"
            leading={<GoogleG />}
            variant="outline"
            onPress={() => void google.signInWithGoogle()}
            loading={google.pending}
          />
          <ErrorText>{google.error}</ErrorText>
        </>
      ) : null}
    </Screen>
  );
}

/** Sign-up step 2: the 6-digit code from the confirmation email. */
function ConfirmCode({ auth }: { auth: ReturnType<typeof usePasswordAuth> }) {
  const [code, setCode] = useState('');
  const [resent, setResent] = useState(false);
  return (
    <Panel tone="subtle">
      <Text>
        We sent a 6-digit code to <Text className="font-semibold">{auth.confirmEmail}</Text>. Enter
        it to finish creating your account.
      </Text>
      <Field
        label="Code"
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
      />
      <ActionButton
        title="Confirm"
        variant="accent"
        icon={ArrowRight}
        loading={auth.pending}
        onPress={() => void auth.verifyCode(code)}
      />
      <ActionButton
        title={resent ? 'Code sent again' : 'Send a new code'}
        variant="outline"
        disabled={auth.pending}
        onPress={async () => setResent(await auth.resendCode())}
      />
      <ActionButton
        title="Use a different email"
        variant="outline"
        onPress={() => {
          auth.cancelConfirm();
          auth.setError(null);
        }}
      />
      <ErrorText>{auth.error}</ErrorText>
    </Panel>
  );
}
