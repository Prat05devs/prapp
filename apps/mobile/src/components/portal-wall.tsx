import { Image } from 'expo-image';
import { Linking, View } from 'react-native';
import { PressableScale } from '@/components/motion/pressable-scale';
import { publicAssetUrl } from '@prapp/shared';
import type { CataloguePortal } from '@prapp/api-client';
import { Text } from '@/components/ui';
import { cn } from '@/lib/utils';
import { appEnv } from '@/lib/env';

/** One portal: its logo (name when there is no logo) and domain; opens the portal's site. */
function PortalTile({ portal, className }: { portal: CataloguePortal; className?: string }) {
  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={portal.name}
      onPress={() => void Linking.openURL(portal.homepageUrl)}
      className={cn(
        'h-20 items-center justify-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 active:bg-subtle',
        className,
      )}
    >
      {portal.logoPath ? (
        <Image
          source={{ uri: publicAssetUrl(appEnv().EXPO_PUBLIC_SUPABASE_URL, portal.logoPath) }}
          contentFit="contain"
          style={{ width: '100%', height: 32 }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text numberOfLines={1} className="text-center font-display text-[15px] text-ink">
          {portal.name}
        </Text>
      )}
      <Text numberOfLines={1} className="text-[11px] text-slate">
        {portal.domain}
      </Text>
    </PressableScale>
  );
}

/** Our publishing network, two per row. */
export function PortalWall({ portals }: { portals: CataloguePortal[] }) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-2.5">
      {portals.map((p) => (
        <PortalTile key={p.domain} portal={p} className="w-[48.5%]" />
      ))}
    </View>
  );
}
