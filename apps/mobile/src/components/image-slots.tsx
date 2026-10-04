import { Image } from 'expo-image';
import { CircleCheck, Upload } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { OrderImage } from '@prapp/api-client';
import { Icon, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/theme';

export function ImageSlots({
  orderId,
  images,
  busy,
  editable,
  onPick,
  onRemove,
}: {
  orderId: string;
  images: OrderImage[];
  busy: 1 | 2 | null;
  editable: boolean;
  onPick: (position: 1 | 2) => void;
  onRemove: (image: OrderImage) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = images.map((i) => i.storagePath).join('|');
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    // Signed thumbnail URLs come from the API (GET /api/orders/:id/edit).
    api.orders.edit(orderId).then(
      (r) => !cancelled && setUrls(r.imageUrls),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [orderId, key]);

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text variant="label">Images (1 required, up to 2)</Text>
        <Text className={`text-body-sm ${images.length ? 'text-verified' : 'text-slate'}`}>
          {images.length} of 2 added
        </Text>
      </View>
      <View className="flex-row gap-3">
        {([1, 2] as const).map((position) => {
          const image = images.find((i) => i.position === position);
          const url = image ? urls[image.storagePath] : undefined;
          if (image) {
            return (
              <View
                key={position}
                className="flex-1 overflow-hidden rounded-lg border border-hairline bg-paper"
              >
                <View>
                  {url ? (
                    <Image
                      source={{ uri: url }}
                      style={{ width: '100%', aspectRatio: 4 / 3 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="aspect-[4/3] w-full bg-elevated" />
                  )}
                  <View className="absolute left-2 top-2 rounded-sm bg-ink/80 px-1.5 py-px">
                    <Text className="font-sans-semibold text-[12px] text-white">
                      Photo {position}
                    </Text>
                  </View>
                  {busy === position ? (
                    <View className="absolute inset-0 items-center justify-center bg-white/60">
                      <ActivityIndicator color={COLORS.ink} />
                    </View>
                  ) : null}
                </View>
                <View className="flex-row items-center justify-between px-3 py-2">
                  <Text className="text-[12px] text-slate">
                    {Math.round(image.sizeBytes / 1024)} KB
                  </Text>
                  <Icon as={CircleCheck} size={14} className="text-verified" />
                </View>
                {editable ? (
                  <View className="flex-row gap-4 border-t border-divider px-3 py-2">
                    <Pressable onPress={() => onPick(position)} disabled={busy !== null}>
                      <Text className="font-sans-semibold text-label-sm text-ink">Replace</Text>
                    </Pressable>
                    <Pressable onPress={() => onRemove(image)} disabled={busy !== null}>
                      <Text className="font-sans-semibold text-label-sm text-slate">Remove</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }
          return (
            <Pressable
              key={position}
              accessibilityRole="button"
              disabled={!editable || busy !== null}
              onPress={() => onPick(position)}
              className="aspect-[4/3] flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-paper p-3 active:border-ink"
            >
              {busy === position ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <View className="h-9 w-9 items-center justify-center rounded-full bg-subtle">
                  <Icon as={Upload} size={16} className="text-slate" />
                </View>
              )}
              <Text className="font-sans-semibold text-label-sm text-ink">
                {busy === position ? 'Uploading…' : `Add photo ${position}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
