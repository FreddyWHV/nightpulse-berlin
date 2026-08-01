import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/utils';

interface SelectChipProps {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
}

/**
 * Single pill used for interests, vibes and districts.
 * Selected state is the only place brand violet appears in dense lists.
 */
export function SelectChip({ label, hint, selected, onPress, size = 'md' }: SelectChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'rounded-full border active:opacity-70',
        size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2.5',
        selected ? 'border-brand bg-brand' : 'border-line bg-card',
      )}
    >
      <Text
        className={cn(
          'font-medium',
          size === 'sm' ? 'text-[13px]' : 'text-[14px]',
          selected ? 'text-white' : 'text-ink',
        )}
      >
        {label}
      </Text>
      {hint ? (
        <Text className={cn('mt-0.5 text-[11px]', selected ? 'text-white/75' : 'text-ink-faint')}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}
