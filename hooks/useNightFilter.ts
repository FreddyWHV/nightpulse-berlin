import { useMemo } from 'react';
import { parseISO } from 'date-fns';

import { useEventFeed } from '@/hooks/useEvents';
import { formatDayButton, formatDayHeadline, nightKeyOf } from '@/lib/dates';
import { useFavoritesStore } from '@/lib/favoritesStore';
import { useFilterStore } from '@/lib/filterStore';
import { useProfileStore } from '@/lib/profileStore';
import { rankEvents } from '@/lib/recommend';
import { VIBE_LABELS } from '@/lib/taxonomy';

/**
 * Everything feed and map need from the shared date/vibe filter, so both tabs
 * show identical labels and identical ranking.
 */
export function useNightFilter() {
  const query = useEventFeed();

  const day = useFilterStore((state) => state.day);
  const vibes = useFilterStore((state) => state.vibes);

  const favorites = useFavoritesStore((state) => state.items);

  const genres = useProfileStore((state) => state.genres);
  const districts = useProfileStore((state) => state.districts);
  const maxPrice = useProfileStore((state) => state.maxPrice);
  const freeOnly = useProfileStore((state) => state.freeOnly);

  const events = useMemo(() => query.data?.events ?? [], [query.data]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of events) {
      const key = nightKeyOf(event.starts_at);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const ranked = useMemo(() => {
    const nightEvents = events.filter((event) => nightKeyOf(event.starts_at) === day);
    return rankEvents(nightEvents, {
      genres,
      vibes,
      districts,
      maxPrice,
      freeOnly,
      favorites: Object.keys(favorites),
    });
  }, [events, day, genres, vibes, districts, maxPrice, freeOnly, favorites]);

  const selectedDate = useMemo(() => parseISO(day), [day]);

  const vibeLabel = useMemo(() => {
    if (vibes.length === 0) return 'Any vibe';
    const first = VIBE_LABELS[vibes[0]] ?? vibes[0];
    return vibes.length === 1 ? first : `${first} +${vibes.length - 1}`;
  }, [vibes]);

  return {
    ...query,
    events,
    counts,
    day,
    vibes,
    selectedDate,
    headline: formatDayHeadline(selectedDate),
    dateLabel: formatDayButton(selectedDate),
    vibeLabel,
    ranked,
    hasProfile: genres.length > 0,
  };
}
