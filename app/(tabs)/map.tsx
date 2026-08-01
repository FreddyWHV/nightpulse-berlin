import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

const BERLIN_REGION = {
  latitude: 52.505,
  longitude: 13.42,
  latitudeDelta: 0.11,
  longitudeDelta: 0.11,
};

export default function MapScreen() {
  const router = useRouter();
  const { headline, dateLabel, vibeLabel, vibes, counts, day, ranked } = useNightFilter();

  const setDay = useFilterStore((state) => state.setDay);
  const toggleVibe = useFilterStore((state) => state.toggleVibe);
  const clearVibes = useFilterStore((state) => state.clearVibes);

  const [dateOpen, setDateOpen] = useState(false);
  const [vibeOpen, setVibeOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { located, recommendedIds } = useMemo(() => {
    const withCoordinates = (entry: ScoredEvent) =>
      entry.event.latitude != null && entry.event.longitude != null;
    return {
      located: [...ranked.recommended, ...ranked.others].filter(withCoordinates),
      recommendedIds: new Set(ranked.recommended.map((entry) => entry.event.id)),
    };
  }, [ranked]);

  const byId = useMemo(() => {
    const map = new Map<string, ScoredEvent>();
    for (const entry of located) map.set(entry.event.id, entry);
    return map;
  }, [located]);

  /**
   * Pins carry no labels on purpose — name, venue and details only show up once
   * an event has actually been tapped.
   */
  const markers = useMemo<MapMarker[]>(
    () =>
      located.flatMap((entry) => {
        const { latitude, longitude } = entry.event;
        if (latitude == null || longitude == null) return [];
        const isActive = entry.event.id === activeId;
        return [
          {
            id: entry.event.id,
            coordinate: { latitude, longitude },
            title: isActive ? entry.event.title : undefined,
            description: isActive
              ? [entry.event.venue_name, entry.event.district].filter(Boolean).join(' · ')
              : undefined,
            color: recommendedIds.has(entry.event.id) ? palette.brand : palette.inkFaint,
          },
        ];
      }),
    [located, recommendedIds, activeId],
  );

  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <SafeAreaView edges={['top']} className="bg-canvas flex-1">
      <FilterHeader
        title={headline}
        caption={`${located.length} ${located.length === 1 ? 'place' : 'places'} on the map`}
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
          <View className="absolute right-4 bottom-4 left-4">
            <View className="mb-2 flex-row justify-end">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close event"
                onPress={() => setActiveId(null)}
                className="border-line bg-card h-8 w-8 items-center justify-center rounded-full border active:opacity-70"
              >
                <X color={palette.inkSoft} size={16} />
              </Pressable>
            </View>
            <EventCard
              compact
              item={active}
              highlight={recommendedIds.has(active.event.id)}
              onPress={() =>
                router.push({ pathname: '/event/[id]', params: { id: active.event.id } })
              }
            />
          </View>
        ) : (
          <View className="absolute right-0 bottom-5 left-0 items-center">
            <View className="border-line bg-card/95 rounded-full border px-3.5 py-2">
              <Text className="text-ink-soft text-[12px] font-medium">
                Tap a pin to see the event
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
