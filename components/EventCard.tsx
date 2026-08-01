import { Image, Pressable, Text, View } from 'react-native';

import { formatPrice, formatTime } from '@/lib/dates';
import { INTEREST_LABELS, VIBE_LABELS } from '@/lib/taxonomy';
import type { ScoredEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventCardProps {
  item: ScoredEvent;
  onPress: () => void;
  /** Highlights the card with the brand rule and match line. */
  highlight?: boolean;
}

function tagsOf(item: ScoredEvent): string[] {
  const fromMatches = [
    ...item.interestHits.map((id) => INTEREST_LABELS[id] ?? id),
    ...item.vibeHits.map((id) => VIBE_LABELS[id] ?? id),
  ];
  if (fromMatches.length) return fromMatches.slice(0, 3);

  const raw = [...(item.event.category ?? []), ...(item.event.vibe_tags ?? [])];
  return raw.slice(0, 3).map((tag) => tag.replace(/[-_]/g, ' '));
}

export function EventCard({ item, onPress, highlight = false }: EventCardProps) {
  const { event } = item;
  const tags = tagsOf(item);
  const lineup = event.lineup?.filter(Boolean) ?? [];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'bg-card flex-row overflow-hidden rounded-2xl border active:opacity-80',
        highlight ? 'border-brand-tint-strong' : 'border-line',
      )}
    >
      {highlight ? <View className="bg-brand w-[3px]" /> : null}

      <View className="flex-1 flex-row gap-3 p-4">
        <View className="w-[52px] pt-0.5">
          <Text className="text-ink text-[15px] font-semibold">{formatTime(event.starts_at)}</Text>
          <Text className="text-ink-faint mt-0.5 text-[11px]">
            {event.is_free ? 'frei' : formatPrice(event.price_min, event.price_max, event.is_free)}
          </Text>
        </View>

        <View className="flex-1">
          <Text numberOfLines={2} className="text-ink text-[16px] leading-[21px] font-semibold">
            {event.title}
          </Text>

          <Text numberOfLines={1} className="text-ink-soft mt-1 text-[13px]">
            {[event.venue_name, event.district].filter(Boolean).join(' · ')}
          </Text>

          {lineup.length ? (
            <Text numberOfLines={1} className="text-ink-faint mt-0.5 text-[12px]">
              {lineup.join(', ')}
            </Text>
          ) : null}

          {tags.length ? (
            <View className="mt-2.5 flex-row flex-wrap gap-1.5">
              {tags.map((tag) => (
                <View
                  key={tag}
                  className={cn(
                    'rounded-md px-2 py-[3px]',
                    highlight ? 'bg-brand-tint' : 'bg-canvas',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[11px] font-medium capitalize',
                      highlight ? 'text-brand' : 'text-ink-soft',
                    )}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={{ width: 64, height: 64, borderRadius: 12 }}
            resizeMode="cover"
          />
        ) : null}
      </View>
    </Pressable>
  );
}
