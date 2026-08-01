import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Pressable, Text, View } from 'react-native';
import { Button, BottomSheet } from 'heroui-native';
import { Check } from 'lucide-react-native';

import { VIBES } from '@/lib/taxonomy';
import { cn } from '@/lib/utils';

interface VibePickerSheetProps {
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
  /** Selected vibe ids, empty = "Egal". */
  value: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

function OptionRow({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-80',
        selected ? 'border-brand-tint-strong bg-brand-tint' : 'border-line bg-card',
      )}
    >
      <View className="flex-1">
        <Text className={cn('text-[15px] font-semibold', selected ? 'text-brand' : 'text-ink')}>
          {label}
        </Text>
        <Text className="text-ink-soft mt-0.5 text-[12.5px]">{hint}</Text>
      </View>
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-full border',
          selected ? 'border-brand bg-brand' : 'border-line-strong bg-card',
        )}
      >
        {selected ? <Check color="#FFFFFF" size={14} /> : null}
      </View>
    </Pressable>
  );
}

/** Bottom sheet for the "Wonach ist dir?" filter button. */
export function VibePickerSheet({
  isOpen,
  onOpenChange,
  value,
  onToggle,
  onClear,
}: VibePickerSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={['78%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full"
          backgroundClassName="bg-card"
          handleIndicatorClassName="bg-line-strong"
        >
          <View className="flex-1">
            <View className="px-5 pb-3">
              <BottomSheet.Title className="text-ink text-[19px] font-semibold tracking-[-0.3px]">
                Wonach ist dir?
              </BottomSheet.Title>
              <BottomSheet.Description className="text-ink-soft mt-1 text-[13px] leading-[18px]">
                Mehrfachauswahl möglich. Der Feed sortiert danach, die Karte hebt Treffer hervor.
              </BottomSheet.Description>
            </View>

            <BottomSheetScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 8 }}
            >
              <OptionRow
                label="Egal"
                hint="Alles zeigen, was läuft"
                selected={value.length === 0}
                onPress={onClear}
              />
              {VIBES.map((vibe) => (
                <OptionRow
                  key={vibe.id}
                  label={vibe.label}
                  hint={vibe.hint}
                  selected={value.includes(vibe.id)}
                  onPress={() => onToggle(vibe.id)}
                />
              ))}
            </BottomSheetScrollView>

            <View className="border-line pb-safe-offset-4 border-t px-5 pt-3">
              <Button onPress={() => onOpenChange(false)}>
                <Button.Label>
                  {value.length ? `${value.length} Vibes übernehmen` : 'Alles anzeigen'}
                </Button.Label>
              </Button>
            </View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
