import { Pressable, Text, View } from 'react-native';

import { EventCover } from '@/components/EventCover';
import { OrganizerBadge } from '@/components/OrganizerBadge';
import { formatPrice, formatTimeRange } from '@/lib/dates';
import { INTEREST_LABELS, VIBE_LABELS, resolveInterests, resolveVibes } from '@/lib/taxonomy';
import type { ScoredEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventCardProps {
  item: ScoredEvent;
  onPress: () => void;
  /** Marks the card as a profile match. */
  highlight?: boolean;
  /** Compact variant used on the map overlay. */
  compact?: boolean;
}

function tagsOf(item: ScoredEvent): string[] {
  const matched = [
    ...item.interestHits.map((id) => INTEREST_LABELS[id] ?? id),
    ...item.vibeHits.map((id) => VIBE_LABELS[id] ?? id),
  ];
  if (matched.length) return [...new Set(matched)].slice(0, 3);

  const derived = [
    ...resolveInterests(item.event.category).map((id) => INTEREST_LABELS[id] ?? id),
    ...resolveVibes(item.event.vibe_tags).map((id) => VIBE_LABELS[id] ?? id),
  ];
  if (derived.length) return [...new Set(derived)].slice(0, 3);

  return (item.event.category ?? []).slice(0, 2).map((tag) => tag.replace(/[-_]/g, ' '));
}

export function EventCard({ item, onPress, highlight = false, compact = false }: EventCardProps) {
  const { event } = item;
  const tags = tagsOf(item);
  const lineup = event.lineup?.filter(Boolean) ?? [];
  const coverSize = compact ? 72 : 92;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'bg-card overflow-hidden rounded-3xl border p-3 active:opacity-90',
        highlight ? 'border-brand-tint-strong' : 'border-line',
      )}
    >
      <View className="flex-row gap-3.5">
        <View className="flex-1 py-0.5">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-ink-soft text-[12.5px] font-semibold">
              {formatTimeRange(event.starts_at, compact ? null : event.ends_at)}
            </Text>
            <View className="bg-line-strong h-[3px] w-[3px] rounded-full" />
            <Text numberOfLines={1} className="text-ink-faint flex-1 text-[12.5px]">
              {formatPrice(event.price_min, event.price_max, event.is_free)}
            </Text>
          </View>

          <Text
            numberOfLines={2}
            className="text-ink mt-1 text-[16.5px] leading-[21px] font-semibold tracking-[-0.3px]"
          >
            {event.title}
          </Text>

          <View className="mt-2">
            <OrganizerBadge
              name={event.organizer_name ?? event.venue_name}
              imageUrl={event.organizer_image_url}
              suffix={event.district}
              size={20}
            />
          </View>

          {lineup.length && !compact ? (
            <Text numberOfLines={1} className="text-ink-faint mt-1.5 text-[12px]">
              {lineup.join(', ')}
            </Text>
          ) : null}
        </View>

        <EventCover
          event={event}
          width={coverSize}
          height={coverSize}
          rounded="rounded-2xl"
          monogramSize={15}
        />
      </View>

      {highlight || tags.length ? (
        <View className="mt-3 flex-row flex-wrap items-center gap-1.5">
          {highlight ? (
            <View className="bg-brand-tint rounded-full px-2.5 py-[5px]">
              <Text className="text-brand text-[11px] font-semibold">Für dich</Text>
            </View>
          ) : null}
          {tags.map((tag) => (
            <View key={tag} className="bg-surface rounded-full px-2.5 py-[5px]">
              <Text className="text-ink-soft text-[11px] font-medium capitalize">{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
