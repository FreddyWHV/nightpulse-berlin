import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Info } from 'lucide-react-native';

import { DateStrip } from '@/components/DateStrip';
import { EventCard } from '@/components/EventCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectChip } from '@/components/SelectChip';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { useEventFeed } from '@/hooks/useEvents';
import { palette } from '@/lib/colors';
import { buildDayOptions, formatDayHeadline, nightKeyOf } from '@/lib/dates';
import { useProfileStore } from '@/lib/profileStore';
import { rankEvents } from '@/lib/recommend';
import { VIBES } from '@/lib/taxonomy';
import type { ScoredEvent } from '@/lib/types';

type FeedRow =
  | { kind: 'section'; key: string; title: string; caption?: string }
  | { kind: 'event'; key: string; item: ScoredEvent; highlight: boolean }
  | { kind: 'note'; key: string; text: string };

export default function FeedScreen() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useEventFeed();

  const interests = useProfileStore((state) => state.interests);
  const profileVibes = useProfileStore((state) => state.vibes);
  const districts = useProfileStore((state) => state.districts);
  const maxPrice = useProfileStore((state) => state.maxPrice);
  const freeOnly = useProfileStore((state) => state.freeOnly);

  const days = useMemo(() => buildDayOptions(14), []);
  const [selectedKey, setSelectedKey] = useState(() => days[0].key);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  const events = useMemo(() => data?.events ?? [], [data]);
  const selectedDay = days.find((day) => day.key === selectedKey) ?? days[0];

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const event of events) {
      const key = nightKeyOf(event.starts_at);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const feed = useMemo(() => {
    const dayEvents = events.filter((event) => nightKeyOf(event.starts_at) === selectedKey);
    return rankEvents(dayEvents, {
      interests,
      profileVibes,
      selectedVibes,
      districts,
      maxPrice,
      freeOnly,
    });
  }, [events, selectedKey, interests, profileVibes, selectedVibes, districts, maxPrice, freeOnly]);

  const rows = useMemo<FeedRow[]>(() => {
    const result: FeedRow[] = [];

    if (feed.recommended.length) {
      result.push({
        kind: 'section',
        key: 'sec-rec',
        title: 'Passt zu dir',
        caption: `${feed.recommended.length} ${feed.recommended.length === 1 ? 'Vorschlag' : 'Vorschläge'}`,
      });
      for (const item of feed.recommended) {
        result.push({ kind: 'event', key: `r-${item.event.id}`, item, highlight: true });
      }
    } else if (feed.hasTaste) {
      result.push({
        kind: 'note',
        key: 'note-empty-rec',
        text:
          selectedVibes.length > 0
            ? 'Kein Treffer für diesen Vibe an diesem Tag. Andere Auswahl oder anderer Tag?'
            : 'Für diesen Tag passt nichts exakt zu deinen Interessen.',
      });
    }

    if (feed.others.length) {
      result.push({
        kind: 'section',
        key: 'sec-others',
        title: feed.recommended.length ? 'Außerdem in Berlin' : 'Heute in Berlin',
        caption: `${feed.others.length} Events`,
      });
      for (const item of feed.others) {
        result.push({ kind: 'event', key: `o-${item.event.id}`, item, highlight: false });
      }
    }

    if (!feed.recommended.length && !feed.others.length) {
      result.push({
        kind: 'note',
        key: 'note-empty',
        text: 'Für diesen Tag liegen keine Events vor.',
      });
    }

    return result;
  }, [feed, selectedVibes.length]);

  const toggleVibe = (id: string) => {
    setSelectedVibes((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  return (
    <SafeAreaView edges={['top']} className="bg-canvas flex-1">
      <ScreenHeader
        overline="Berlin heute Nacht"
        title={formatDayHeadline(selectedDay.date)}
        subtitle={
          interests.length || profileVibes.length
            ? 'Vorschläge nach deinem Profil'
            : 'Noch kein Profil — leg deine Interessen fest'
        }
      />

      <DateStrip days={days} selectedKey={selectedKey} onSelect={setSelectedKey} counts={counts} />

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View>
            <View className="px-5 pt-3 pb-1">
              <Text className="text-ink text-[13px] font-semibold">Wonach ist dir?</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}
            >
              <SelectChip
                label="Egal"
                size="sm"
                selected={selectedVibes.length === 0}
                onPress={() => setSelectedVibes([])}
              />
              {VIBES.map((vibe) => (
                <SelectChip
                  key={vibe.id}
                  label={vibe.label}
                  size="sm"
                  selected={selectedVibes.includes(vibe.id)}
                  onPress={() => toggleVibe(vibe.id)}
                />
              ))}
            </ScrollView>

            {!interests.length && !profileVibes.length ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/profile')}
                className="border-brand-tint-strong bg-brand-tint mx-5 mt-2 mb-2 flex-row items-center justify-between rounded-2xl border p-4 active:opacity-80"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-brand text-[15px] font-semibold">Profil einrichten</Text>
                  <Text className="text-ink-soft mt-0.5 text-[13px]">
                    Wähle Musikrichtungen und Vibes — der Feed sortiert danach.
                  </Text>
                </View>
                <ChevronRight color={palette.brand} size={20} />
              </Pressable>
            ) : null}

            {data?.notice ? (
              <View className="border-line bg-card mx-5 mt-1 mb-2 flex-row items-start gap-2 rounded-xl border px-3 py-2.5">
                <Info color={palette.inkFaint} size={14} style={{ marginTop: 2 }} />
                <Text className="text-ink-faint flex-1 text-[12px] leading-[17px]">
                  {data.notice}
                </Text>
              </View>
            ) : null}

            {isPending ? (
              <View className="items-center py-10">
                <ActivityIndicator color={palette.brand} />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'section') {
            return (
              <View className="flex-row items-baseline justify-between px-5 pt-5 pb-2">
                <Text className="text-ink text-[17px] font-bold tracking-[-0.3px]">
                  {row.title}
                </Text>
                {row.caption ? (
                  <Text className="text-ink-faint text-[12px]">{row.caption}</Text>
                ) : null}
              </View>
            );
          }

          if (row.kind === 'note') {
            return (
              <View className="border-line-strong bg-card mx-5 my-2 rounded-2xl border border-dashed px-4 py-5">
                <Text className="text-ink-soft text-[13px] leading-[19px]">{row.text}</Text>
              </View>
            );
          }

          return (
            <View className="px-5 pb-2.5">
              <EventCard
                item={row.item}
                highlight={row.highlight}
                onPress={() =>
                  router.push({ pathname: '/event/[id]', params: { id: row.item.event.id } })
                }
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
