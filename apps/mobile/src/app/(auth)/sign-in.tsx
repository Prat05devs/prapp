import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import {
  ActionButton,
  ErrorText,
  Field,
  LivePill,
  PageHeader,
  Panel,
  Screen,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/components/ui';
import { useEmailOtp, type AuthMode } from '@/hooks/use-email-otp';
import { GoogleG } from '@/components/google-g';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';

export default function SignInScreen() {
  const google = useGoogleSignIn();
  const otp = useEmailOtp();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <Screen>
      <View className="gap-4">
        <LivePill>Fact check · Publish</LivePill>
        <PageHeader
          title="Welcome to NewsVio"
          lede="Check forwards for free, and publish your story on our news portals."
        />
      </View>

      <Panel tone="subtle">
        <Tabs value={mode} onValueChange={(v) => setMode(v as AuthMode)}>
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
          hint={
            mode === 'login'
              ? "We'll email you a sign-in link. No password needed."
              : "We'll email you a link to create your account."
          }
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <ActionButton
          title={mode === 'login' ? 'Send sign-in link' : 'Create account'}
          variant="accent"
          icon={ArrowRight}
          loading={otp.pending}
          onPress={async () => {
            const sentTo = await otp.requestCode(email, mode);
            if (sentTo) router.push({ pathname: '/otp', params: { email: sentTo } });
          }}
        />
        <ErrorText>{otp.error}</ErrorText>
      </Panel>

      {google.available ? (
        <>
          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Text className="font-mono text-code uppercase text-faint">Or continue with</Text>
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
