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
  Text,
} from '@/components/ui';
import { useEmailOtp } from '@/hooks/use-email-otp';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';

export default function SignInScreen() {
  const google = useGoogleSignIn();
  const otp = useEmailOtp();
  const [email, setEmail] = useState('');

  return (
    <Screen>
      <View className="gap-4">
        <LivePill>Fact check · Publish</LivePill>
        <PageHeader
          title="Welcome"
          lede="Check forwards for free, and publish your story on our news portals."
        />
      </View>

      <Panel tone="subtle">
        <Field
          label="Email"
          hint="We'll email you a 6-digit code. No password needed."
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <ActionButton
          title="Send code"
          variant="accent"
          icon={ArrowRight}
          loading={otp.pending}
          onPress={async () => {
            const sentTo = await otp.requestCode(email);
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
