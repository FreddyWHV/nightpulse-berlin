import { Pressable, Text } from 'react-native';
import { Heart } from 'lucide-react-native';

import { palette } from '@/lib/colors';
import { organizerKey, useFavoritesStore } from '@/lib/favoritesStore';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  /** Organiser name — venue or promoter. */
  name: string | null | undefined;
  district?: string | null;
  imageUrl?: string | null;
  /** `icon` = round heart button, `pill` = heart plus label. */
  variant?: 'icon' | 'pill';
  size?: number;
}

/**
 * Heart toggle that saves an organiser as a favourite. The list is stored on the
 * device and lifts that organiser's events in the feed.
 */
export function FavoriteButton({
  name,
  district = null,
  imageUrl = null,
  variant = 'icon',
  size = 36,
}: FavoriteButtonProps) {
  const items = useFavoritesStore((state) => state.items);
  const toggle = useFavoritesStore((state) => state.toggle);

  if (!name) return null;

  const key = organizerKey(name);
  const saved = Boolean(items[key]);
  const iconSize = variant === 'pill' ? 15 : Math.round(size * 0.44);

  const onPress = () => toggle({ name, district, imageUrl });
  const label = saved ? `Remove ${name} from favourites` : `Save ${name} as a favourite`;

  if (variant === 'pill') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className={cn(
          'flex-row items-center gap-1.5 rounded-full border px-3 py-2 active:opacity-70',
          saved ? 'border-brand-tint-strong bg-brand-tint' : 'border-line-strong bg-card',
        )}
      >
        <Heart
          color={saved ? palette.brandInk : palette.inkSoft}
          fill={saved ? palette.brandInk : 'transparent'}
          size={iconSize}
        />
        <Text
          className={cn('text-[13px] font-semibold', saved ? 'text-brand-ink' : 'text-ink-soft')}
        >
          {saved ? 'Saved' : 'Save'}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={cn(
        'items-center justify-center border active:opacity-70',
        saved ? 'border-brand-tint-strong bg-brand-tint' : 'border-line bg-card',
      )}
    >
      <Heart
        color={saved ? palette.brandInk : palette.inkSoft}
        fill={saved ? palette.brandInk : 'transparent'}
        size={iconSize}
      />
    </Pressable>
  );
}
