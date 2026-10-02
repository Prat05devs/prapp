import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';
import { CHECKED_SOURCES, CHECKED_SOURCES_TEXT_ONLY, publicAssetUrl } from '@prapp/shared';
import { Text } from '@/components/ui';
import { appEnv } from '@/lib/env';

/**
 * "Where we look": outlets and fact-checkers our checks search. They are not partners.
 * Google and PIB are named in text only (golden rule 9).
 */
export function SourceStrip() {
  const supabaseUrl = appEnv().EXPO_PUBLIC_SUPABASE_URL;
  return (
    <View className="gap-2.5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-4"
      >
        {CHECKED_SOURCES.map((s) => (
          <View
            key={s.domain}
            className="flex-row items-center gap-2 rounded-full border border-hairline bg-canvas py-1.5 pl-1.5 pr-3"
          >
            <Image
              source={{ uri: publicAssetUrl(supabaseUrl, `sources/${s.domain}.webp`) }}
              contentFit="contain"
              style={{ width: 22, height: 22, borderRadius: 11 }}
            />
            <Text className="text-label-sm text-ink">{s.name}</Text>
          </View>
        ))}
      </ScrollView>
      <Text className="font-mono text-[10px] text-slate">
        {`Plus ${CHECKED_SOURCES_TEXT_ONLY.join(', ')} and 100+ trusted outlets. Not partners or endorsements.`}
      </Text>
    </View>
  );
}
