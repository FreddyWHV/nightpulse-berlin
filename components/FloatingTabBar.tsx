import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { List, Map, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/lib/colors';
import { cn } from '@/lib/utils';

const ICONS = {
  index: List,
  map: Map,
  profile: UserRound,
} as const;

function isKnownTabName(name: string): name is keyof typeof ICONS {
  return name in ICONS;
}

/** Height of the pill itself. */
const BAR_HEIGHT = 62;
/** Gap between the pill and the bottom edge / the content above it. */
const BAR_GAP = 12;

/**
 * Space a scrollable screen has to leave at the bottom so its last row is not
 * covered by the floating bar.
 */
export function useTabBarClearance(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + BAR_GAP * 2 + Math.max(insets.bottom, 8);
}

/**
 * Free-floating tab bar that hovers over the content instead of sitting in a
 * docked strip. Every item keeps a fixed width so the pill never resizes while
 * switching tabs.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, 8) + BAR_GAP,
      }}
      className="items-center"
    >
      <View
        className="border-line bg-card flex-row items-center gap-1 rounded-full border p-1.5"
        style={{
          shadowColor: palette.ink,
          shadowOpacity: 0.16,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 10 },
          elevation: 16,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = options?.title ?? route.name;
          const Icon = isKnownTabName(route.name) ? ICONS[route.name] : List;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={{ width: 78, height: BAR_HEIGHT - 12 }}
              className={cn(
                'items-center justify-center gap-1 rounded-full active:opacity-70',
                focused && 'bg-brand-tint',
              )}
            >
              <Icon color={focused ? palette.brandInk : palette.inkFaint} size={20} />
              <Text
                className={cn(
                  'text-[10.5px] font-semibold',
                  focused ? 'text-brand-ink' : 'text-ink-faint',
                )}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
