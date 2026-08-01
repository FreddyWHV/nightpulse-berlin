import { Image, Text, View } from 'react-native';

import { monogram } from '@/components/EventCover';
import { cn } from '@/lib/utils';

interface OrganizerBadgeProps {
  name: string | null;
  /** Organiser photo or logo. Falls back to a monogram chip. */
  imageUrl?: string | null;
  size?: number;
  /** Text in front of the name, e.g. "Hosted by". */
  prefix?: string;
  /** Text after the name, e.g. the district. */
  suffix?: string | null;
  textClassName?: string;
}

/**
 * Organiser line with room for their photo — the picture comes from
 * `sources.image_url` and is exposed as `organizer_image_url` by the feed view.
 */
export function OrganizerBadge({
  name,
  imageUrl,
  size = 22,
  prefix,
  suffix,
  textClassName,
}: OrganizerBadgeProps) {
  if (!name) return null;

  const label = [prefix, name, suffix].filter(Boolean).join(' · ');

  return (
    <View className="flex-row items-center gap-2">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size / 2 }}
          className="bg-brand-tint border-brand-tint-strong items-center justify-center border"
        >
          <Text style={{ fontSize: size * 0.42 }} className="text-brand-ink font-semibold">
            {monogram(name)}
          </Text>
        </View>
      )}
      <Text numberOfLines={1} className={cn('text-ink-soft flex-1 text-[12.5px]', textClassName)}>
        {label}
      </Text>
    </View>
  );
}
