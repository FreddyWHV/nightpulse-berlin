import { Pressable, Text, View } from 'react-native';
import { CalendarDays, SlidersHorizontal } from 'lucide-react-native';

import { CityPicker } from '@/components/CityPicker';
import { PulseBadge } from '@/components/PulseLogo';
import { palette } from '@/lib/colors';
import { cn } from '@/lib/utils';

const HEADLINE_SIZE = 22;
const HEADLINE_LINE = 27;

interface FilterHeaderProps {
  /** One-line context below the headline. */
  caption: string;
  dateLabel: string;
  vibeLabel: string;
  /** True when at least one vibe is picked. */
  vibeActive: boolean;
  onPressDate: () => void;
  onPressVibe: () => void;
}

/** Icon-only filter trigger — the selection itself is spelled out in the meta line. */
function FilterIconButton({
  icon,
  active,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      className={cn(
        'h-9 w-9 items-center justify-center rounded-full border active:opacity-70',
        active ? 'border-brand-tint-strong bg-brand-tint' : 'border-line bg-card',
      )}
    >
      {icon}
    </Pressable>
  );
}

/**
 * Fixed top bar shared by feed and map: headline with the city switcher, logo and
 * a single meta line that carries date, vibe and counts next to two small filter
 * icons. Both screens render it with identical geometry so nothing moves when
 * switching tabs.
 */
export function FilterHeader({
  caption,
  dateLabel,
  vibeLabel,
  vibeActive,
  onPressDate,
  onPressVibe,
}: FilterHeaderProps) {
  const metaLine = [dateLabel, vibeActive ? vibeLabel : null, caption].filter(Boolean).join(' · ');

  return (
    <View className="border-line bg-canvas border-b px-5 pt-2 pb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-start gap-1.5 pr-3">
          <Text
            numberOfLines={1}
            className="text-ink font-semibold tracking-[-0.6px]"
            style={{ fontSize: HEADLINE_SIZE, lineHeight: HEADLINE_LINE }}
          >
            NIGHTPULSE in
          </Text>
          {/* Shrinks first on very narrow screens so the wordmark stays whole. */}
          <View className="shrink">
            <CityPicker fontSize={HEADLINE_SIZE} lineHeight={HEADLINE_LINE} />
          </View>
        </View>
        <PulseBadge size={40} />
      </View>

      <View className="mt-1 flex-row items-center gap-2">
        <Text numberOfLines={1} className="text-ink-soft flex-1 pr-1 text-[13px]">
          {metaLine}
        </Text>
        <FilterIconButton
          icon={<CalendarDays color={palette.ink} size={16} />}
          active={false}
          onPress={onPressDate}
          accessibilityLabel={`Date: ${dateLabel}. Pick a date`}
        />
        <FilterIconButton
          icon={<SlidersHorizontal color={vibeActive ? palette.brandInk : palette.ink} size={16} />}
          active={vibeActive}
          onPress={onPressVibe}
          accessibilityLabel={`Vibe: ${vibeLabel}. Pick a vibe`}
        />
      </View>
    </View>
  );
}
