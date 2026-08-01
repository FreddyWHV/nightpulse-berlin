import { Image, View } from 'react-native';

import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { photoForEvent } from '@/lib/photos';
import type { EventRow } from '@/lib/types';
import { cn } from '@/lib/utils';

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
 * back to a stand-in photo matching its genres — one of twenty, picked per
 * event, so a list does not repeat the same shot.
 */
export function EventCover({ event, height, width, rounded = 'rounded-2xl' }: EventCoverProps) {
  const hasPhoto = Boolean(event.image_url);

  return (
    <View
      style={{ height, width: width ?? '100%' }}
      className={cn('bg-brand-deep overflow-hidden', rounded)}
    >
      <Image
        source={hasPhoto ? { uri: event.image_url ?? undefined } : photoForEvent(event)}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {hasPhoto ? null : (
        <LinearGradient
          colors={['rgba(0,59,29,0.05)', 'rgba(0,59,29,0.38)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          className="absolute inset-0"
        />
      )}
    </View>
  );
}
