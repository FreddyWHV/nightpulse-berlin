import { Pressable, Text, View } from 'react-native';

import { EventCover } from '@/components/EventCover';
import { OrganizerBadge } from '@/components/OrganizerBadge';
import { formatPrice, formatTimeRange } from '@/lib/dates';
import { GENRE_LABELS, VIBE_LABELS, resolveGenres, resolveVibes } from '@/lib/taxonomy';
import type { ScoredEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventCardProps {
  item: ScoredEvent;
  onPress: () => void;
  /** Marks the event as a profile match. */
  highlight?: boolean;
  /** Compact variant used on the map overlay. */
  compact?: boolean;
}

function tagsOf(item: ScoredEvent): string[] {
  const matched = [
    ...item.genreHits.map((id) => GENRE_LABELS[id] ?? id),
    ...item.vibeHits.map((id) => VIBE_LABELS[id] ?? id),
  ];
  if (matched.length) return [...new Set(matched)].slice(0, 3);

  const derived = [
    ...resolveGenres(item.event.category).map((id) => GENRE_LABELS[id] ?? id),
    ...resolveVibes(item.event.vibe_tags).map((id) => VIBE_LABELS[id] ?? id),
  ];
  if (derived.length) return [...new Set(derived)].slice(0, 3);

  return (item.event.category ?? []).slice(0, 2).map((tag) => tag.replace(/[-_]/g, ' '));
}

/**
 * One event as a plain list row — no card, no frame. The photo on the right and
 * the hairline the list draws underneath do the separating.
 */
export function EventCard({ item, onPress, highlight = false, compact = false }: EventCardProps) {
  const { event } = item;
  const tags = tagsOf(item);
  const lineup = event.lineup?.filter(Boolean) ?? [];
  const price = formatPrice(event.price_min, event.price_max, event.is_free);
  const meta = [formatTimeRange(event.starts_at, compact ? null : event.ends_at), price]
    .filter(Boolean)
    .join(' · ');
  const coverSize = compact ? 64 : 88;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn('flex-row gap-3.5 active:opacity-60', compact ? 'py-1' : 'py-4')}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          {item.favoriteHit || highlight ? (
            <>
              <Text className="text-brand-ink text-[12px] font-semibold">
                {item.favoriteHit ? 'Saved' : 'For you'}
              </Text>
              <View className="bg-line-strong h-[3px] w-[3px] rounded-full" />
            </>
          ) : null}
          <Text numberOfLines={1} className="text-ink-soft flex-1 text-[12.5px] font-medium">
            {meta}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          className="text-ink mt-1 text-[16.5px] leading-[21px] font-semibold tracking-[-0.3px]"
        >
          {event.title}
        </Text>

        <View className="mt-1.5">
          <OrganizerBadge
            name={event.organizer_name ?? event.venue_name}
            imageUrl={event.organizer_image_url}
            suffix={event.district}
            size={20}
          />
        </View>

        {lineup.length && !compact ? (
          <Text numberOfLines={1} className="text-ink-faint mt-1 text-[12px]">
            {lineup.join(', ')}
          </Text>
        ) : null}

        {tags.length ? (
          <Text numberOfLines={1} className="text-ink-faint mt-1 text-[12px] capitalize">
            {tags.join(' · ')}
          </Text>
        ) : null}
      </View>

      <EventCover event={event} width={coverSize} height={coverSize} rounded="rounded-2xl" />
    </Pressable>
  );
}
