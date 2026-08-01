import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

import { DateStrip } from '@/components/DateStrip';
import { EventCard } from '@/components/EventCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import MapView, { type MapMarker } from '@/components/MapView';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { useEventFeed } from '@/hooks/useEvents';
import { palette } from '@/lib/colors';
import { buildDayOptions, nightKeyOf } from '@/lib/dates';
import { useProfileStore } from '@/lib/profileStore';
import { rankEvents } from '@/lib/recommend';
import type { ScoredEvent } from '@/lib/types';

const BERLIN_REGION = {
  latitude: 52.505,
  longitude: 13.42,
  latitudeDelta: 0.11,
  longitudeDelta: 0.11,
};

export default function MapScreen() {
  const router = useRouter();
  const { data } = useEventFeed();

  const interests = useProfileStore((state) => state.interests);
  const profileVibes = useProfileStore((state) => state.vibes);
  const districts = useProfileStore((state) => state.districts);
  const maxPrice = useProfileStore((state) => state.maxPrice);
  const freeOnly = useProfileStore((state) => state.freeOnly);

  const days = useMemo(() => buildDayOptions(14), []);
  const [selectedKey, setSelectedKey] = useState(() => days[0].key);
  const [activeId, setActiveId] = useState<string | null>(null);

  const events = useMemo(() => data?.events ?? [], [data]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of events) {
      const key = nightKeyOf(event.starts_at);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const { scored, recommendedIds } = useMemo(() => {
    const dayEvents = events.filter(
      (event) =>
        nightKeyOf(event.starts_at) === selectedKey &&
        event.latitude != null &&
        event.longitude != null,
    );
    const ranked = rankEvents(dayEvents, {
      interests,
      profileVibes,
      selectedVibes: [],
      districts,
      maxPrice,
      freeOnly,
    });
    return {
      scored: [...ranked.recommended, ...ranked.others],
      recommendedIds: new Set(ranked.recommended.map((entry) => entry.event.id)),
    };
  }, [events, selectedKey, interests, profileVibes, districts, maxPrice, freeOnly]);

  const byId = useMemo(() => {
    const map = new Map<string, ScoredEvent>();
    for (const entry of scored) map.set(entry.event.id, entry);
    return map;
  }, [scored]);

  const markers = useMemo<MapMarker[]>(
    () =>
      scored.flatMap((entry) => {
        const { latitude, longitude } = entry.event;
        if (latitude == null || longitude == null) return [];
        return [
          {
            id: entry.event.id,
            coordinate: { latitude, longitude },
            title: entry.event.title,
            description: [entry.event.venue_name, entry.event.district].filter(Boolean).join(' · '),
            color: recommendedIds.has(entry.event.id) ? palette.brand : palette.inkFaint,
          },
        ];
      }),
    [scored, recommendedIds],
  );

  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <SafeAreaView edges={['top']} className="bg-canvas flex-1">
      <ScreenHeader
        overline="Karte"
        title="Wo heute was läuft"
        subtitle={`${scored.length} ${scored.length === 1 ? 'Event' : 'Events'} mit Adresse`}
      />

      <DateStrip days={days} selectedKey={selectedKey} onSelect={setSelectedKey} counts={counts} />

      <View className="mt-3 flex-1 overflow-hidden">
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
            <Text className="text-ink text-[11px] font-medium">Für dich</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="bg-ink-faint h-2 w-2 rounded-full" />
            <Text className="text-ink-soft text-[11px] font-medium">Weitere</Text>
          </View>
        </View>

        {active ? (
          <View className="absolute right-4 bottom-4 left-4">
            <View className="mb-2 flex-row justify-end">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Auswahl schließen"
                onPress={() => setActiveId(null)}
                className="border-line bg-card h-8 w-8 items-center justify-center rounded-full border active:opacity-70"
              >
                <X color={palette.inkSoft} size={16} />
              </Pressable>
            </View>
            <EventCard
              item={active}
              highlight={recommendedIds.has(active.event.id)}
              onPress={() =>
                router.push({ pathname: '/event/[id]', params: { id: active.event.id } })
              }
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
