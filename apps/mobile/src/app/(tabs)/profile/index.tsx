import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Bell,
  FileText,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  SearchCheck,
  Shield,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Switch, View } from 'react-native';
import { FC_AI_CONSENT, FC_AI_PROVIDERS, supportContacts } from '@prapp/shared';
import { ApiError } from '@prapp/api-client';
import {
  ActionButton,
  EmptyState,
  ErrorText,
  Group,
  Row,
  ScrollScreen,
  Section,
  Text,
} from '@/components/ui';
import { COLORS } from '@/lib/theme';
import { useAiConsent } from '@/hooks/use-ai-consent';
import { useCatalogue } from '@/hooks/use-catalogue';
import { useSignOut } from '@/hooks/use-sign-out';
import { api } from '@/lib/api';
import { siteUrl } from '@/lib/env';
import { unregisterPush } from '@/lib/push';
import { promptSignIn } from '@/lib/sign-in-prompt';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// Profile (LLD §13, wireframe in docs/MOBILE-UX.md): a settings screen of grouped rows.
export default function ProfileScreen() {
  const { me, session } = useAuth();
  const { pending, signOut } = useSignOut();
  const catalogue = useCatalogue();
  const aiConsent = useAiConsent();
  const settings = catalogue.data?.settings;
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const site = siteUrl();
  const { phone, email, whatsapp, hours } = supportContacts(settings);
  const web = (path: string) => () => void WebBrowser.openBrowserAsync(`${site}${path}`);

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'Deletes your profile, notifications, devices and fact-check uploads. Completed order records are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.me.delete();
              await unregisterPush().catch(() => {});
              await supabase.auth.signOut({ scope: 'local' });
            } catch (e) {
              setDeleteError(e instanceof ApiError ? e.message : 'Could not delete your account.');
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollScreen header={{ title: 'Profile' }}>
      {session ? (
        <>
          <View className="flex-row items-center gap-4 rounded-lg border border-hairline bg-paper p-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
              <Text className="font-display text-headline-sm uppercase text-white">
                {(me?.fullName || me?.email || '?').slice(0, 1)}
              </Text>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="font-display text-headline-sm text-ink">{me?.fullName}</Text>
              <Text numberOfLines={1} className="text-body-sm text-slate">
                {me?.email}
              </Text>
            </View>
          </View>

          <Section title="Account">
            <Group>
              <Row icon={Phone} label="Phone" value={me?.phone ?? '-'} />
              <Row icon={Mail} label="Email" value={me?.email ?? '-'} />
              <Row
                icon={Bell}
                label="Notifications"
                onPress={() => router.push('/notifications')}
              />
            </Group>
          </Section>
        </>
      ) : (
        <EmptyState
          icon={UserRound}
          title="You're browsing as a guest"
          body="Fact checks are free without an account. Log in to check more each day, save your story, pay and track your orders."
        >
          <ActionButton
            title="Log in"
            variant="accent"
            onPress={() => promptSignIn({ mode: 'login' })}
          />
          <ActionButton
            title="Create an account"
            variant="outline"
            onPress={() => promptSignIn({ mode: 'signup' })}
          />
        </EmptyState>
      )}

      {whatsapp || phone || email ? (
        <Section title={`Support${hours ? ` · ${hours}` : ''}`}>
          <Group>
            {whatsapp ? (
              <Row
                icon={MessageCircle}
                label="WhatsApp us"
                external
                onPress={() =>
                  void Linking.openURL(
                    `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I need help.')}`,
                  )
                }
              />
            ) : null}
            {phone ? (
              <Row
                icon={Phone}
                label="Call us"
                value={phone}
                onPress={() => void Linking.openURL(`tel:${phone}`)}
              />
            ) : null}
            {email ? (
              <Row
                icon={Mail}
                label="Email us"
                external
                onPress={() => void Linking.openURL(`mailto:${email}`)}
              />
            ) : null}
          </Group>
        </Section>
      ) : null}

      <Section title="Privacy" footer={FC_AI_CONSENT.settingHint}>
        <Group>
          <Row
            label={FC_AI_CONSENT.settingLabel}
            subtitle={FC_AI_PROVIDERS.join(', ')}
            trailing={
              <Switch
                value={aiConsent.granted}
                onValueChange={(on) => void aiConsent.set(on)}
                trackColor={{ true: COLORS.brand, false: COLORS.hairline }}
                ios_backgroundColor={COLORS.hairline}
                accessibilityLabel={FC_AI_CONSENT.settingLabel}
              />
            }
          />
        </Group>
      </Section>

      <Section title="About">
        <Group>
          <Row
            icon={SearchCheck}
            label="How we check"
            onPress={() => router.push('/how-we-check')}
          />
          <Row icon={FileText} label="Terms" external onPress={web('/terms')} />
          <Row icon={Shield} label="Privacy" external onPress={web('/privacy')} />
        </Group>
      </Section>

      {session ? (
        <>
          <Group>
            <Row
              icon={LogOut}
              label="Sign out"
              trailing={pending ? <ActivityIndicator color={COLORS.slate} /> : undefined}
              disabled={pending}
              onPress={() => void signOut()}
            />
          </Group>

          <Section footer="Deletes your profile, notifications, devices and fact-check uploads. Completed order records are kept. Not possible while an order is in progress.">
            <Group>
              <Row icon={Trash2} label="Delete account" destructive onPress={confirmDelete} />
            </Group>
            <ErrorText>{deleteError}</ErrorText>
          </Section>
        </>
      ) : null}

      <Text className="text-center text-[12px] text-faint">
        {`NewsVio ${Constants.expoConfig?.version ?? ''}`}
      </Text>
    </ScrollScreen>
  );
}
