import { Image, Text, View } from 'react-native';

import coverBar from '@/assets/covers/cover-bar.png';
import coverClub from '@/assets/covers/cover-club.png';
import coverLive from '@/assets/covers/cover-live.png';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { resolveVibes } from '@/lib/taxonomy';
import type { EventRow } from '@/lib/types';
import { cn } from '@/lib/utils';

const FALLBACKS = {
  club: coverClub,
  live: coverLive,
  bar: coverBar,
} as const;

/** Picks the mood image used when an event brings no photo of its own. */
function fallbackFor(event: EventRow): keyof typeof FALLBACKS {
  const vibes = resolveVibes(event.vibe_tags);

  if (vibes.includes('live') || vibes.includes('arts')) return 'live';
  if (
    !vibes.includes('dancing') &&
    (vibes.includes('chill') || vibes.includes('dressy') || vibes.includes('outdoors'))
  ) {
    return 'bar';
  }
  return 'club';
}

export function monogram(value: string | null | undefined): string {
  if (!value) return 'B';
  return value
    .split(/[\s/&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

interface EventCoverProps {
  event: EventRow;
  height: number;
  /** Omit to fill the parent width. */
  width?: number;
  /** Rounding utility class, e.g. `rounded-xl`. */
  rounded?: string;
  /** Monogram size for the placeholder. */
  monogramSize?: number;
}

/**
 * Photo slot of an event. Uses the organiser's own picture when it exists and
 * falls back to a tinted mood image with the venue monogram otherwise.
 */
export function EventCover({
  event,
  height,
  width,
  rounded = 'rounded-2xl',
  monogramSize = 17,
}: EventCoverProps) {
  const hasPhoto = Boolean(event.image_url);

  return (
    <View
      style={{ height, width: width ?? '100%' }}
      className={cn('bg-brand-deep overflow-hidden', rounded)}
    >
      <Image
        source={hasPhoto ? { uri: event.image_url ?? undefined } : FALLBACKS[fallbackFor(event)]}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {hasPhoto ? null : (
        <>
          <LinearGradient
            colors={['rgba(35,12,80,0.35)', 'rgba(35,12,80,0.82)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            className="absolute inset-0"
          />
          <View className="absolute inset-0 items-center justify-center">
            <Text
              style={{ fontSize: monogramSize }}
              className="font-semibold tracking-[1px] text-white/90"
            >
              {monogram(event.organizer_name ?? event.venue_name)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
