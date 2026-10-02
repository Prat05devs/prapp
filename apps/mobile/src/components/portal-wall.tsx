import { Image } from 'expo-image';
import { Linking, Pressable, View } from 'react-native';
import { publicAssetUrl } from '@prapp/shared';
import type { CataloguePortal } from '@prapp/api-client';
import { Text } from '@/components/ui';
import { appEnv } from '@/lib/env';

/** Our publishing network: portal logos (name when there is no logo), two per row. */
export function PortalWall({ portals, limit }: { portals: CataloguePortal[]; limit?: number }) {
  const supabaseUrl = appEnv().EXPO_PUBLIC_SUPABASE_URL;
  const shown = limit ? portals.slice(0, limit) : portals;
  return (
    <View className="flex-row flex-wrap justify-between gap-y-2.5">
      {shown.map((p) => (
        <Pressable
          key={p.domain}
          accessibilityRole="link"
          accessibilityLabel={p.name}
          onPress={() => void Linking.openURL(p.homepageUrl)}
          className="h-20 w-[48.5%] items-center justify-center gap-1.5 rounded-xl border border-hairline bg-canvas px-3 active:border-ink"
        >
          {p.logoPath ? (
            <Image
              source={{ uri: publicAssetUrl(supabaseUrl, p.logoPath) }}
              contentFit="contain"
              style={{ width: '100%', height: 36 }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text className="text-center font-display text-[15px] font-bold text-ink">
              {p.name}
            </Text>
          )}
          <Text className="font-mono text-[9px] text-faint">{p.domain}</Text>
        </Pressable>
      ))}
    </View>
  );
}
