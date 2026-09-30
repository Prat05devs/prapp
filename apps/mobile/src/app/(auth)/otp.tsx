import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Mail, RotateCw } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ActionButton, ErrorText, Icon, PageHeader, Screen, Text } from '@/components/ui';
import { useEmailOtp } from '@/hooks/use-email-otp';
import { cn } from '@/lib/utils';

const LENGTH = 6;

export default function OtpScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const otp = useEmailOtp();
  const [code, setCode] = useState('');
  const input = useRef<TextInput>(null);

  // Opened without an email (e.g. the auth group's default screen on launch): start at sign-in.
  if (!email) return <Redirect href="/sign-in" />;

  return (
    <Screen>
      <PageHeader title="Enter the code" />
      <View className="flex-row items-start gap-2 rounded-xl border border-hairline bg-subtle p-4">
        <Icon as={Mail} size={16} className="mt-0.5 text-emerald-strong" />
        <Text className="flex-1 text-body-sm text-body">
          We sent a 6-digit code to <Text className="font-sans-semibold text-ink">{email}</Text>. It
          expires in 10 minutes.
        </Text>
      </View>

      {/* Stitch OTP boxes over one hidden input, so paste and SMS/email autofill still work. */}
      <Pressable onPress={() => input.current?.focus()} className="flex-row gap-2">
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = i === Math.min(code.length, LENGTH - 1);
          return (
            <View
              key={i}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-xl border',
                code[i] ? 'border-hairline bg-canvas' : 'border-hairline bg-subtle',
                active && 'border-ink bg-canvas',
              )}
            >
              <Text className="font-mono text-headline-sm text-ink">{code[i] ?? ''}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        maxLength={LENGTH}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
        accessibilityLabel="Code"
        className="absolute h-px w-px opacity-0"
      />

      {/* On success the session changes and the root guard leaves this screen. */}
      <ActionButton
        title="Verify and sign in"
        variant="accent"
        loading={otp.pending}
        disabled={code.length < LENGTH}
        onPress={() => void otp.verifyCode(email, code)}
      />
      <ErrorText>{otp.error}</ErrorText>
      <View className="flex-row gap-3">
        <ActionButton
          title="Resend code"
          variant="outline"
          size="default"
          icon={RotateCw}
          className="flex-1"
          onPress={() => void otp.requestCode(email)}
        />
        <ActionButton
          title="Change email"
          variant="outline"
          size="default"
          icon={ArrowLeft}
          className="flex-1"
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}
