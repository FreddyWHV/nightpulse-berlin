import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { Path, Svg } from '@/components/ui/primitives/Svg';
import { CITIES, cityById } from '@/lib/cities';
import { palette } from '@/lib/colors';
import { useFilterStore } from '@/lib/filterStore';
import { cn } from '@/lib/utils';

const MENU_WIDTH = 190;
const EDGE_GAP = 12;

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
 * trigger — tapping it opens a quiet dropdown with the other cities. The menu is
 * anchored by measuring the word instead of using a popover primitive, so the
 * tap works the same on web and on device.
 */
export function CityPicker({ fontSize, lineHeight }: CityPickerProps) {
  const cityId = useFilterStore((state) => state.cityId);
  const setCity = useFilterStore((state) => state.setCity);
  const city = cityById(cityId);

  const { width: windowWidth } = useWindowDimensions();
  const triggerRef = useRef<View | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  const open = useCallback(() => {
    const node = triggerRef.current;
    if (!node) return;

    node.measureInWindow((x, y, width, height) => {
      const maxLeft = Math.max(EDGE_GAP, windowWidth - MENU_WIDTH - EDGE_GAP);
      setAnchor({
        top: y + (height || lineHeight) + 6,
        left: Math.min(Math.max(x, EDGE_GAP), maxLeft),
      });
    });
  }, [lineHeight, windowWidth]);

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={`City: ${city.name}. Change city`}
        hitSlop={8}
        onPress={open}
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

      <Modal
        visible={anchor !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAnchor(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close city list"
          onPress={() => setAnchor(null)}
          style={{ flex: 1 }}
        >
          {anchor ? (
            <View
              className="border-line bg-card absolute rounded-2xl border p-1.5"
              style={{
                top: anchor.top,
                left: anchor.left,
                width: MENU_WIDTH,
                shadowColor: palette.ink,
                shadowOpacity: 0.14,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
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
                      setAnchor(null);
                    }}
                    className={cn(
                      'flex-row items-center gap-2 rounded-xl px-2.5 py-2.5 active:opacity-60',
                      selected && 'bg-brand-tint',
                    )}
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
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
