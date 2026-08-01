import { Image, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { photoForOrganizer } from '@/lib/photos';
import { palette } from '@/lib/colors';
import { organizerKey, useFavoritesStore } from '@/lib/favoritesStore';
import { cn } from '@/lib/utils';

interface OrganizerBadgeProps {
  name: string | null;
  /** Organiser photo or logo. A mock nightlife shot stands in while it is empty. */
  imageUrl?: string | null;
  size?: number;
  /** Text in front of the name, e.g. "Hosted by". */
  prefix?: string;
  /** Text after the name, e.g. the district. */
  suffix?: string | null;
  textClassName?: string;
  /** Shows a small heart when this organiser is saved. */
  showFavoriteMark?: boolean;
}

/**
 * Organiser line with their photo. Uses `sources.image_url` (exposed as
 * `organizer_image_url`) when it exists and a stable mock photo otherwise —
 * never initials.
 */
export function OrganizerBadge({
  name,
  imageUrl,
  size = 22,
  prefix,
  suffix,
  textClassName,
  showFavoriteMark = true,
}: OrganizerBadgeProps) {
  const items = useFavoritesStore((state) => state.items);

  if (!name) return null;

  const label = [prefix, name, suffix].filter(Boolean).join(' · ');
  const saved = showFavoriteMark && Boolean(items[organizerKey(name)]);

  return (
    <View className="flex-row items-center gap-2">
      <Image
        source={imageUrl ? { uri: imageUrl } : photoForOrganizer(name)}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
        className="bg-surface"
      />
      <Text numberOfLines={1} className={cn('text-ink-soft shrink text-[12.5px]', textClassName)}>
        {label}
      </Text>
      {saved ? <Heart color={palette.brandInk} fill={palette.brandInk} size={11} /> : null}
    </View>
  );
}
