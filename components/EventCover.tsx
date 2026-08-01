import { Image, View } from 'react-native';

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

interface EventCoverProps {
  event: EventRow;
  height: number;
  /** Omit to fill the parent width. */
  width?: number;
  /** Rounding utility class, e.g. `rounded-xl`. */
  rounded?: string;
}

/**
 * Photo slot of an event. Uses the event's own picture when it exists and falls
 * back to a mood photo matching the genre — no initials, ever.
 */
export function EventCover({ event, height, width, rounded = 'rounded-2xl' }: EventCoverProps) {
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
        <LinearGradient
          colors={['rgba(0,59,29,0.18)', 'rgba(0,59,29,0.62)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          className="absolute inset-0"
        />
      )}
    </View>
  );
}
