import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

import { DayPickerSheet } from '@/components/DayPickerSheet';
import { EventCard } from '@/components/EventCard';
import { FilterHeader } from '@/components/FilterHeader';
import { VibePickerSheet } from '@/components/VibePickerSheet';
import MapView, { type MapMarker } from '@/components/MapView';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { useNightFilter } from '@/hooks/useNightFilter';
import { palette } from '@/lib/colors';
import { useFilterStore } from '@/lib/filterStore';
import type { ScoredEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

const BERLIN_REGION = {
  latitude: 52.505,
  longitude: 13.42,
  latitudeDelta: 0.11,
  longitudeDelta: 0.11,
};

interface VenueGroup {
  id: string;
  latitude: number;
  longitude: number;
  venueName: string;
  district: string | null;
  events: ScoredEvent[];
  /** True when at least one event here matches the profile. */
  recommended: boolean;
}

/**
 * Several events share one address, so the map pins venues rather than events.
 * Every event of the night stays reachable — matching ones just get the accent
 * colour.
 */
function groupByVenue(entries: ScoredEvent[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();

  for (const entry of entries) {
    const { latitude, longitude } = entry.event;
    if (latitude == null || longitude == null) continue;

    const id = `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
    const existing = groups.get(id);
    if (existing) {
      existing.events.push(entry);
      existing.recommended = existing.recommended || entry.isRecommended;
      continue;
    }

    groups.set(id, {
      id,
      latitude,
      longitude,
      venueName: entry.event.venue_name ?? entry.event.organizer_name ?? 'Berlin',
      district: entry.event.district,
      events: [entry],
      recommended: entry.isRecommended,
    });
  }

  for (const group of groups.values()) {
    group.events.sort(
      (left, right) =>
        new Date(left.event.starts_at).getTime() - new Date(right.event.starts_at).getTime(),
    );
  }

  return [...groups.values()];
}

export default function MapScreen() {
  const router = useRouter();
  const { headline, dateLabel, vibeLabel, vibes, counts, day, ranked } = useNightFilter();

  const setDay = useFilterStore((state) => state.setDay);
  const toggleVibe = useFilterStore((state) => state.toggleVibe);
  const clearVibes = useFilterStore((state) => state.clearVibes);

  const [dateOpen, setDateOpen] = useState(false);
  const [vibeOpen, setVibeOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const groups = useMemo(
    () => groupByVenue([...ranked.recommended, ...ranked.others]),
    [ranked.recommended, ranked.others],
  );

  const eventCount = useMemo(
    () => groups.reduce((total, group) => total + group.events.length, 0),
    [groups],
  );

  const active = useMemo(() => groups.find((group) => group.id === activeId), [groups, activeId]);

  /**
   * Pins carry no labels on purpose — the venue and its programme only show up
   * once a pin has actually been tapped.
   */
  const markers = useMemo<MapMarker[]>(
    () =>
      groups.map((group) => ({
        id: group.id,
        coordinate: { latitude: group.latitude, longitude: group.longitude },
        title: group.id === activeId ? group.venueName : undefined,
        description:
          group.id === activeId
            ? `${group.events.length} ${group.events.length === 1 ? 'event' : 'events'}`
            : undefined,
        color: group.recommended ? palette.brand : palette.inkFaint,
      })),
    [groups, activeId],
  );

  return (
    <SafeAreaView edges={['top']} className="bg-canvas flex-1">
      <FilterHeader
        title={headline}
        caption={`${eventCount} ${eventCount === 1 ? 'event' : 'events'} at ${groups.length} ${
          groups.length === 1 ? 'place' : 'places'
        }`}
        dateLabel={dateLabel}
        vibeLabel={vibeLabel}
        vibeActive={vibes.length > 0}
        onPressDate={() => setDateOpen(true)}
        onPressVibe={() => setVibeOpen(true)}
      />

      <View className="flex-1 overflow-hidden">
        <MapView
          style={{ flex: 1 }}
          initialRegion={BERLIN_REGION}
          markers={markers}
          showsPointsOfInterest={false}
          showsScale={false}
          onMarkerPress={(marker) => setActiveId(marker.id ?? null)}
          onPress={() => setActiveId(null)}
        />

        <View className="border-line bg-card/95 absolute top-3 left-5 flex-row items-center gap-3 rounded-full border px-3 py-2">
          <View className="flex-row items-center gap-1.5">
            <View className="bg-brand h-2 w-2 rounded-full" />
            <Text className="text-ink text-[11px] font-medium">For you</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="bg-ink-faint h-2 w-2 rounded-full" />
            <Text className="text-ink-soft text-[11px] font-medium">Everything else</Text>
          </View>
        </View>

        {active ? (
          <View
            className="bg-card absolute right-0 bottom-0 left-0 rounded-t-3xl px-5 pt-4 pb-5"
            style={{
              shadowColor: '#1A1418',
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: -6 },
              elevation: 12,
            }}
          >
            <View className="flex-row items-start">
              <View className="flex-1 pr-3">
                <Text numberOfLines={1} className="text-ink text-[17px] font-semibold">
                  {active.venueName}
                </Text>
                <Text className="text-ink-soft mt-0.5 text-[12.5px]">
                  {[
                    active.district,
                    `${active.events.length} ${active.events.length === 1 ? 'event' : 'events'} tonight`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close venue"
                onPress={() => setActiveId(null)}
                className="border-line h-8 w-8 items-center justify-center rounded-full border active:opacity-70"
              >
                <X color={palette.inkSoft} size={16} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 260 }}
              showsVerticalScrollIndicator={false}
              className="mt-2"
            >
              {active.events.map((entry, index) => (
                <View
                  key={entry.event.id}
                  className={cn(
                    'py-2.5',
                    index < active.events.length - 1 && 'border-line border-b',
                  )}
                >
                  <EventCard
                    compact
                    item={entry}
                    highlight={entry.isRecommended}
                    onPress={() =>
                      router.push({ pathname: '/event/[id]', params: { id: entry.event.id } })
                    }
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View className="absolute right-0 bottom-5 left-0 items-center">
            <View className="border-line bg-card/95 rounded-full border px-3.5 py-2">
              <Text className="text-ink-soft text-[12px] font-medium">
                Tap a pin to see what is on
              </Text>
            </View>
          </View>
        )}
      </View>

      <DayPickerSheet
        isOpen={dateOpen}
        onOpenChange={setDateOpen}
        value={day}
        onChange={setDay}
        counts={counts}
      />
      <VibePickerSheet
        isOpen={vibeOpen}
        onOpenChange={setVibeOpen}
        value={vibes}
        onToggle={toggleVibe}
        onClear={clearVibes}
      />
    </SafeAreaView>
  );
}
