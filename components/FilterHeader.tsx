import { Pressable, Text, View } from 'react-native';
import { CalendarDays, ChevronDown, SlidersHorizontal } from 'lucide-react-native';

import { palette } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface FilterHeaderProps {
  /** Big headline, e.g. "Heute Abend". Always one line so both tabs match. */
  title: string;
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
        className={cn('flex-1 text-[13px] font-semibold', active ? 'text-brand' : 'text-ink')}
      >
        {label}
      </Text>
      <ChevronDown color={active ? palette.brand : palette.inkFaint} size={14} />
    </Pressable>
  );
}

/**
 * Fixed top bar shared by feed and map: headline plus the two filter buttons.
 * Both screens render it with identical geometry so the buttons never move.
 */
export function FilterHeader({
  title,
  caption,
  dateLabel,
  vibeLabel,
  vibeActive,
  onPressDate,
  onPressVibe,
}: FilterHeaderProps) {
  return (
    <View className="border-line bg-canvas border-b px-5 pt-1 pb-3.5">
      <Text className="text-brand text-[11px] font-semibold tracking-[1.4px] uppercase">
        Nachtplan Berlin
      </Text>
      <Text
        numberOfLines={1}
        className="text-ink mt-1 text-[25px] leading-[30px] font-semibold tracking-[-0.6px]"
      >
        {title}
      </Text>
      <Text numberOfLines={1} className="text-ink-soft mt-0.5 text-[13px]">
        {caption}
      </Text>

      <View className="mt-3 flex-row gap-2">
        <FilterButton
          icon={<CalendarDays color={palette.ink} size={15} />}
          label={dateLabel}
          active={false}
          onPress={onPressDate}
          accessibilityLabel="Datum wählen"
        />
        <FilterButton
          icon={<SlidersHorizontal color={vibeActive ? palette.brand : palette.ink} size={15} />}
          label={vibeLabel}
          active={vibeActive}
          onPress={onPressVibe}
          accessibilityLabel="Vibe wählen"
        />
      </View>
    </View>
  );
}
