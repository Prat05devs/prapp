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
  TriangleAlert,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { ApiError } from '@prapp/api-client';
import {
  ActionButton,
  ErrorText,
  Eyebrow,
  Icon,
  ListGroup,
  ListRow,
  Panel,
  TabScreen,
  Text,
} from '@/components/ui';
import { useFocusedData } from '@/hooks/use-async';
import { useSignOut } from '@/hooks/use-sign-out';
import { api } from '@/lib/api';
import { appEnv } from '@/lib/env';
import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const str = (v: unknown) =>
  typeof v === 'string' && v.trim() && !v.includes('XXXX') ? v : undefined;

// Profile (LLD §13): details, notifications, support, terms, privacy, sign out, delete account.
export default function ProfileScreen() {
  const { me } = useAuth();
  const { pending, signOut } = useSignOut();
  const settings = useFocusedData(async () => (await api.catalogue.get()).settings);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const site = appEnv().EXPO_PUBLIC_API_URL;
  const phone = str(settings.data?.['support.phone']);
  const email = str(settings.data?.['support.email']);
  const whatsapp = str(settings.data?.['support.whatsapp']);
  const hours = str(settings.data?.['support.hours']);
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
    <TabScreen>
      <Panel tone="subtle">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-ink">
            <Text className="font-display text-headline-sm uppercase text-white">
              {(me?.fullName || me?.email || '?').slice(0, 1)}
            </Text>
          </View>
          <View className="flex-1">
            <Text variant="h3">{me?.fullName}</Text>
            <Text className="font-mono text-code text-slate">{me?.email}</Text>
          </View>
        </View>
        <View className="rounded-xl border border-hairline bg-canvas">
          <View className="flex-row items-center gap-3 px-4 py-3">
            <Icon as={Phone} size={16} className="text-slate" />
            <Text variant="muted" className="flex-1">
              Phone
            </Text>
            <Text className="font-mono text-code text-ink">{me?.phone}</Text>
          </View>
          <View className="h-px bg-hairline" />
          <View className="flex-row items-center gap-3 px-4 py-3">
            <Icon as={Mail} size={16} className="text-slate" />
            <Text variant="muted" className="flex-1">
              Email
            </Text>
            <Text numberOfLines={1} className="max-w-[60%] font-mono text-code text-ink">
              {me?.email}
            </Text>
          </View>
        </View>
      </Panel>

      <ListGroup>
        <ListRow icon={Bell} label="Notifications" onPress={() => router.push('/notifications')} />
      </ListGroup>

      <View className="gap-3">
        <Eyebrow>Support{hours ? ` · ${hours}` : ''}</Eyebrow>
        <ListGroup>
          {whatsapp ? (
            <ListRow
              icon={MessageCircle}
              label="WhatsApp us"
              onPress={() =>
                void Linking.openURL(
                  `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I need help.')}`,
                )
              }
            />
          ) : null}
          {phone ? (
            <ListRow
              icon={Phone}
              label="Call us"
              detail={phone}
              onPress={() => void Linking.openURL(`tel:${phone}`)}
            />
          ) : null}
          {email ? (
            <ListRow
              icon={Mail}
              label="Email us"
              onPress={() => void Linking.openURL(`mailto:${email}`)}
            />
          ) : null}
        </ListGroup>
      </View>

      <View className="gap-3">
        <Eyebrow>About</Eyebrow>
        <ListGroup>
          <ListRow icon={SearchCheck} label="How we check" onPress={web('/methodology')} />
          <ListRow icon={FileText} label="Terms" onPress={web('/terms')} />
          <ListRow icon={Shield} label="Privacy" onPress={web('/privacy')} />
        </ListGroup>
      </View>

      <ActionButton
        title="Sign out"
        variant="outline"
        icon={LogOut}
        loading={pending}
        onPress={() => void signOut()}
      />

      <View className="gap-3 rounded-2xl border border-danger/25 p-5">
        <View className="flex-row items-center gap-2">
          <Icon as={TriangleAlert} size={16} className="text-danger" />
          <Text className="font-sans-medium text-label-md text-danger">Delete account</Text>
        </View>
        <Text className="text-body-sm text-body">
          Deletes your profile, notifications, devices and fact-check uploads. Completed order
          records are kept. Not possible while an order is in progress.
        </Text>
        <ActionButton
          title="Delete account…"
          variant="destructive-outline"
          size="default"
          icon={Trash2}
          onPress={confirmDelete}
        />
        <ErrorText>{deleteError}</ErrorText>
      </View>
    </TabScreen>
  );
}
