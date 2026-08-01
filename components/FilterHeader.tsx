import { Pressable, Text, View } from 'react-native';
import { CalendarDays, ChevronDown, SlidersHorizontal } from 'lucide-react-native';

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

function FilterButton({
  icon,
  label,
  active,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={cn(
        'flex-1 flex-row items-center gap-2 rounded-full border px-3.5 py-2.5 active:opacity-70',
        active ? 'border-brand-tint-strong bg-brand-tint' : 'border-line bg-card',
      )}
    >
      {icon}
      <Text
        numberOfLines={1}
        className={cn('flex-1 text-[13px] font-semibold', active ? 'text-brand-ink' : 'text-ink')}
      >
        {label}
      </Text>
      <ChevronDown color={active ? palette.brandInk : palette.inkFaint} size={14} />
    </Pressable>
  );
}

/**
 * Fixed top bar shared by feed and map: headline with the city switcher, logo
 * and the two filter buttons. Both screens render it with identical geometry so
 * nothing moves when switching tabs.
 */
export function FilterHeader({
  caption,
  dateLabel,
  vibeLabel,
  vibeActive,
  onPressDate,
  onPressVibe,
}: FilterHeaderProps) {
  return (
    <View className="border-line bg-canvas border-b px-5 pt-2 pb-3.5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-start gap-1.5">
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
          <Text numberOfLines={1} className="text-ink-soft mt-0.5 text-[13px]">
            {caption}
          </Text>
        </View>
        <PulseBadge size={40} />
      </View>

      <View className="mt-3 flex-row gap-2">
        <FilterButton
          icon={<CalendarDays color={palette.ink} size={15} />}
          label={dateLabel}
          active={false}
          onPress={onPressDate}
          accessibilityLabel="Pick a date"
        />
        <FilterButton
          icon={<SlidersHorizontal color={vibeActive ? palette.brandInk : palette.ink} size={15} />}
          label={vibeLabel}
          active={vibeActive}
          onPress={onPressVibe}
          accessibilityLabel="Pick a vibe"
        />
      </View>
    </View>
  );
}
