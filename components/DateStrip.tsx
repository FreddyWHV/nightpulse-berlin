import { Pressable, ScrollView, Text, View } from 'react-native';

import type { DayOption } from '@/lib/dates';
import { cn } from '@/lib/utils';

interface DateStripProps {
  days: DayOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Number of events per day key, rendered as a small counter. */
  counts?: Record<string, number>;
}

export function DateStrip({ days, selectedKey, onSelect, counts }: DateStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {days.map((day) => {
        const selected = day.key === selectedKey;
        const count = counts?.[day.key];

        return (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${day.label} ${day.dayNumber}. ${day.month}`}
            onPress={() => onSelect(day.key)}
            className={cn(
              'w-[62px] items-center rounded-2xl border py-2.5 active:opacity-70',
              selected ? 'border-brand bg-brand' : 'border-line bg-card',
            )}
          >
            <Text
              className={cn(
                'text-[11px] font-semibold uppercase',
                selected ? 'text-white/80' : day.isWeekend ? 'text-brand' : 'text-ink-faint',
              )}
            >
              {day.label}
            </Text>
            <Text
              className={cn(
                'mt-0.5 text-[19px] font-semibold',
                selected ? 'text-white' : 'text-ink',
              )}
            >
              {day.dayNumber}
            </Text>
            <View className="mt-1 h-1.5 flex-row items-center">
              {count ? (
                <Text className={cn('text-[10px]', selected ? 'text-white/70' : 'text-ink-faint')}>
                  {count}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
