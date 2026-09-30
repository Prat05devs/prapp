import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { DEFAULT_PHONE_COUNTRY } from '@prapp/shared';
import { CountryPicker } from '@/components/country-picker';
import {
  ActionButton,
  ErrorText,
  Field,
  Input,
  PageHeader,
  Panel,
  Screen,
  Text,
} from '@/components/ui';
import { useCompleteProfile } from '@/hooks/use-complete-profile';

export default function CompleteProfileScreen() {
  const { initialName, pending, fieldErrors, error, submit } = useCompleteProfile();
  const [fullName, setFullName] = useState(initialName);
  const [country, setCountry] = useState<string>(DEFAULT_PHONE_COUNTRY);
  const [phone, setPhone] = useState('');

  return (
    <Screen>
      <PageHeader
        eyebrow="One last step"
        title="Complete your profile"
        lede="We need your name and phone number before you can place an order."
      />
      <Panel tone="subtle">
        <Field
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          maxLength={100}
          error={fieldErrors.fullName}
        />
        <View className="gap-2">
          <Text variant="label">Phone number</Text>
          <View className="flex-row gap-2">
            <CountryPicker value={country} onChange={setCountry} />
            <Input
              className="flex-1"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              accessibilityLabel="Phone number"
            />
          </View>
          <ErrorText>{fieldErrors.phone ?? fieldErrors.country}</ErrorText>
        </View>
        <ErrorText>{error}</ErrorText>
        <ActionButton
          title="Continue"
          variant="accent"
          icon={ArrowRight}
          loading={pending}
          onPress={() => void submit({ fullName, country, phone })}
        />
      </Panel>
    </Screen>
  );
}
