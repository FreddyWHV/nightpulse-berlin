import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { addDays, isAfter, isBefore, isSameDay, startOfMonth } from 'date-fns';
import { BottomSheet } from 'heroui-native';

import {
  WEEKDAY_INITIALS,
  buildMonthMatrix,
  dayKey,
  formatMonthTitle,
  nightDateOf,
} from '@/lib/dates';
import { cn } from '@/lib/utils';

interface DayPickerSheetProps {
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
  /** Selected night key. */
  value: string;
  onChange: (key: string) => void;
  /** Events per night key, shown as a dot under the date. */
  counts?: Record<string, number>;
  /** How many nights ahead can be picked. */
  rangeDays?: number;
}

function nextWeekday(from: Date, weekday: number): Date {
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDays(from, offset);
    if (candidate.getDay() === weekday) return candidate;
  }
  return from;
}

/** Bottom sheet calendar behind the date filter button. */
export function DayPickerSheet({
  isOpen,
  onOpenChange,
  value,
  onChange,
  counts,
  rangeDays = 60,
}: DayPickerSheetProps) {
  const tonight = useMemo(() => nightDateOf(), []);
  const lastDate = useMemo(() => addDays(tonight, rangeDays - 1), [tonight, rangeDays]);

  const months = useMemo(() => {
    const result: Date[] = [];
    let cursor = startOfMonth(tonight);
    while (!isAfter(cursor, lastDate)) {
      result.push(cursor);
      cursor = startOfMonth(addDays(cursor, 32));
    }
    return result;
  }, [tonight, lastDate]);

  const quickOptions = useMemo(
    () => [
      { label: 'Today', date: tonight },
      { label: 'Tomorrow', date: addDays(tonight, 1) },
      { label: 'Friday', date: nextWeekday(tonight, 5) },
      { label: 'Saturday', date: nextWeekday(tonight, 6) },
    ],
    [tonight],
  );

  const pick = (date: Date) => {
    onChange(dayKey(date));
    onOpenChange(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={['74%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full"
          backgroundClassName="bg-card"
          handleIndicatorClassName="bg-line-strong"
        >
          <View className="flex-1">
            <View className="px-5 pb-4">
              <BottomSheet.Title className="text-ink text-[19px] font-semibold tracking-[-0.3px]">
                Which night?
              </BottomSheet.Title>
              <BottomSheet.Description className="text-ink-soft mt-1 text-[13px] leading-[18px]">
                A night runs until 6 am — a party starting at 2 am still counts as the evening
                before.
              </BottomSheet.Description>

              <View className="mt-3.5 flex-row flex-wrap gap-2">
                {quickOptions.map((option) => {
                  const selected = dayKey(option.date) === value;
                  return (
                    <Pressable
                      key={option.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => pick(option.date)}
                      className={cn(
                        'rounded-full border px-3.5 py-2 active:opacity-70',
                        selected ? 'border-brand bg-brand' : 'border-line bg-surface',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-[13px] font-semibold',
                          selected ? 'text-on-brand' : 'text-ink',
                        )}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <BottomSheetScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            >
              <View className="flex-row pb-1">
                {WEEKDAY_INITIALS.map((initial) => (
                  <Text
                    key={initial}
                    className="text-ink-faint flex-1 text-center text-[11px] font-semibold"
                  >
                    {initial}
                  </Text>
                ))}
              </View>

              {months.map((month) => (
                <View key={month.toISOString()} className="pt-3">
                  <Text className="text-ink mb-1.5 text-[14px] font-semibold">
                    {formatMonthTitle(month)}
                  </Text>
                  {buildMonthMatrix(month).map((week) => (
                    <View key={week.id} className="flex-row">
                      {week.days.map((cell) => {
                        const date = cell.date;
                        if (!date) {
                          return <View key={cell.id} className="flex-1" />;
                        }

                        const key = dayKey(date);
                        const selected = key === value;
                        const selectable = !isBefore(date, tonight) && !isAfter(date, lastDate);
                        const count = counts?.[key] ?? 0;
                        const isTonight = isSameDay(date, tonight);

                        return (
                          <Pressable
                            key={cell.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected, disabled: !selectable }}
                            disabled={!selectable}
                            onPress={() => pick(date)}
                            className={cn(
                              'flex-1 items-center rounded-xl py-2',
                              selected && 'bg-brand',
                              !selected && isTonight && 'bg-brand-tint',
                            )}
                          >
                            <Text
                              className={cn(
                                'text-[15px]',
                                selected
                                  ? 'text-on-brand font-semibold'
                                  : selectable
                                    ? 'text-ink font-medium'
                                    : 'text-ink-faint',
                              )}
                            >
                              {date.getDate()}
                            </Text>
                            <View className="mt-1 h-1 w-1 items-center justify-center">
                              {count > 0 ? (
                                <View
                                  className={cn(
                                    'h-1 w-1 rounded-full',
                                    selected ? 'bg-on-brand' : 'bg-brand-ink',
                                  )}
                                />
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ))}
            </BottomSheetScrollView>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
