import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Pressable, Text, View } from 'react-native';
import { Button, BottomSheet } from 'heroui-native';
import { Check } from 'lucide-react-native';

import { VIBES } from '@/lib/taxonomy';
import { cn } from '@/lib/utils';

interface VibePickerSheetProps {
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
  /** Selected vibe ids, empty = any vibe. */
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
      className="border-line flex-row items-center gap-3 border-b py-3.5 active:opacity-60"
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

/** Bottom sheet behind the vibe filter button. Music genres live in the profile. */
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
          snapPoints={['80%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full"
          backgroundClassName="bg-card"
          handleIndicatorClassName="bg-line-strong"
        >
          <View className="flex-1">
            <View className="px-5 pb-3">
              <BottomSheet.Title className="text-ink text-[19px] font-semibold tracking-[-0.3px]">
                What are you in the mood for?
              </BottomSheet.Title>
              <BottomSheet.Description className="text-ink-soft mt-1 text-[13px] leading-[18px]">
                Pick as many as you like. The feed ranks by them, the map highlights the matches.
              </BottomSheet.Description>
            </View>

            <BottomSheetScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            >
              <OptionRow
                label="Anything"
                hint="Show everything that is on"
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
                  {value.length
                    ? `Apply ${value.length} ${value.length === 1 ? 'vibe' : 'vibes'}`
                    : 'Show everything'}
                </Button.Label>
              </Button>
            </View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
