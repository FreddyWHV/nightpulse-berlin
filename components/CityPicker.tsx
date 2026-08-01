import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Popover } from 'heroui-native';

import { Path, Svg } from '@/components/ui/primitives/Svg';
import { CITIES, cityById } from '@/lib/cities';
import { palette } from '@/lib/colors';
import { useFilterStore } from '@/lib/filterStore';
import { cn } from '@/lib/utils';

/** Barely-there hint that the city can be changed. */
function DropdownCaret() {
  return (
    <Svg width={9} height={5} viewBox="0 0 9 5">
      <Path d="M0 0 L9 0 L4.5 5 Z" fill={palette.inkFaint} opacity={0.55} />
    </Svg>
  );
}

interface CityPickerProps {
  /** Font size of the surrounding headline so the city matches it. */
  fontSize: number;
  lineHeight: number;
}

/**
 * The city part of the headline: "NIGHTPULSE in <city>". The city itself is the
 * trigger — tapping it opens a quiet dropdown with the other cities. The only
 * affordance is a small caret tucked under the word.
 */
export function CityPicker({ fontSize, lineHeight }: CityPickerProps) {
  const cityId = useFilterStore((state) => state.cityId);
  const setCity = useFilterStore((state) => state.setCity);
  const city = cityById(cityId);

  const [open, setOpen] = useState(false);

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`City: ${city.name}. Change city`}
          className="active:opacity-60"
        >
          <Text
            numberOfLines={1}
            className="text-brand-ink font-semibold tracking-[-0.6px]"
            style={{ fontSize, lineHeight }}
          >
            {city.name}
          </Text>
          <View className="mt-[1px] flex-row justify-end pr-[1px]">
            <DropdownCaret />
          </View>
        </Pressable>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Overlay />
        <Popover.Content
          presentation="popover"
          placement="bottom"
          align="start"
          offset={4}
          width={186}
          className="px-1.5 py-1.5"
        >
          {CITIES.map((entry) => {
            const selected = entry.id === city.id;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setCity(entry.id);
                  setOpen(false);
                }}
                className="flex-row items-center gap-2 rounded-xl px-2.5 py-2 active:opacity-60"
              >
                <Text
                  className={cn(
                    'flex-1 text-[15px]',
                    selected ? 'text-brand-ink font-semibold' : 'text-ink font-medium',
                  )}
                >
                  {entry.name}
                </Text>
                {entry.hasListings ? null : (
                  <Text className="text-ink-faint text-[11px] font-medium tracking-[0.6px] uppercase">
                    Soon
                  </Text>
                )}
              </Pressable>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}
