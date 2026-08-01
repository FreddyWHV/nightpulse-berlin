import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { DayPickerSheet } from '@/components/DayPickerSheet';
import { EventCard } from '@/components/EventCard';
import { FilterHeader } from '@/components/FilterHeader';
import { VibePickerSheet } from '@/components/VibePickerSheet';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { useNightFilter } from '@/hooks/useNightFilter';
import { palette } from '@/lib/colors';
import { useFilterStore } from '@/lib/filterStore';
import type { ScoredEvent } from '@/lib/types';

type FeedRow =
  | { kind: 'section'; key: string; title: string; caption?: string }
  | { kind: 'event'; key: string; item: ScoredEvent; highlight: boolean }
  | { kind: 'note'; key: string; text: string };

export default function FeedScreen() {
  const router = useRouter();
  const {
    headline,
    dateLabel,
    vibeLabel,
    vibes,
    counts,
    day,
    ranked,
    hasProfile,
    isPending,
    refetch,
    isRefetching,
  } = useNightFilter();

  const setDay = useFilterStore((state) => state.setDay);
  const toggleVibe = useFilterStore((state) => state.toggleVibe);
  const clearVibes = useFilterStore((state) => state.clearVibes);

  const [dateOpen, setDateOpen] = useState(false);
  const [vibeOpen, setVibeOpen] = useState(false);

  const rows = useMemo<FeedRow[]>(() => {
    const result: FeedRow[] = [];

    if (ranked.recommended.length) {
      result.push({
        kind: 'section',
        key: 'sec-rec',
        title: 'Your kind of night',
        caption: `${ranked.recommended.length}`,
      });
      for (const item of ranked.recommended) {
        result.push({ kind: 'event', key: `r-${item.event.id}`, item, highlight: true });
      }
    } else if (ranked.hasTaste) {
      result.push({
        kind: 'note',
        key: 'note-empty-rec',
        text: vibes.length
          ? 'Nothing matches this mood on this night. Try another vibe or another date.'
          : 'Nothing on this night matches your genres exactly.',
      });
    }

    if (ranked.others.length) {
      result.push({
        kind: 'section',
        key: 'sec-others',
        title: ranked.recommended.length ? 'Also on in Berlin' : 'On in Berlin',
        caption: `${ranked.others.length}`,
      });
      for (const item of ranked.others) {
        result.push({ kind: 'event', key: `o-${item.event.id}`, item, highlight: false });
      }
    }

    if (!ranked.recommended.length && !ranked.others.length && !isPending) {
      result.push({
        kind: 'note',
        key: 'note-empty',
        text: 'No events listed for this night yet.',
      });
    }

    return result;
  }, [ranked, vibes.length, isPending]);

  const total = ranked.recommended.length + ranked.others.length;
  const caption = ranked.recommended.length
    ? `${total} events · ${ranked.recommended.length} for you`
    : `${total} ${total === 1 ? 'event' : 'events'}`;

  return (
    <SafeAreaView edges={['top']} className="bg-canvas flex-1">
      <FilterHeader
        title={headline}
        caption={caption}
        dateLabel={dateLabel}
        vibeLabel={vibeLabel}
        vibeActive={vibes.length > 0}
        onPressDate={() => setDateOpen(true)}
        onPressVibe={() => setVibeOpen(true)}
      />

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View>
            {hasProfile ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/profile')}
                className="border-brand-tint-strong bg-brand-tint mx-5 mt-4 flex-row items-center justify-between rounded-3xl border p-4 active:opacity-80"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-brand text-[15px] font-semibold">Pick your genres</Text>
                  <Text className="text-ink-soft mt-0.5 text-[13px] leading-[18px]">
                    Set your music taste in the profile — the feed ranks by it.
                  </Text>
                </View>
                <ChevronRight color={palette.brand} size={20} />
              </Pressable>
            )}

            {isPending ? (
              <View className="items-center py-12">
                <ActivityIndicator color={palette.brand} />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'section') {
            return (
              <View className="flex-row items-center justify-between px-5 pt-6 pb-2.5">
                <Text className="text-ink-faint text-[11px] font-semibold tracking-[1.4px] uppercase">
                  {row.title}
                </Text>
                {row.caption ? (
                  <Text className="text-ink-faint text-[12px] font-medium">{row.caption}</Text>
                ) : null}
              </View>
            );
          }

          if (row.kind === 'note') {
            return (
              <View className="border-line bg-card mx-5 mt-4 rounded-3xl border border-dashed px-4 py-5">
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
