import { View } from 'react-native';

import { Path, Svg } from '@/components/ui/primitives/Svg';
import { palette } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface PulseLogoProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** The NightPulse mark: a heartbeat line, violet by default. */
export function PulseLogo({ size = 22, color = palette.brand, strokeWidth = 2.2 }: PulseLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M1.6 12.6h4.1l2.1-5.9 3.5 11.1 2.6-7.6 1.6 2.4h5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

interface PulseBadgeProps {
  /** Diameter of the round badge. */
  size?: number;
  /** `tint` = violet mark on a light tint, `solid` = white mark on violet. */
  tone?: 'tint' | 'solid';
  className?: string;
}

/** Round container for the pulse mark, used as the app logo in headers. */
export function PulseBadge({ size = 36, tone = 'tint', className }: PulseBadgeProps) {
  const solid = tone === 'solid';
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={cn(
        'items-center justify-center',
        solid ? 'bg-brand' : 'bg-brand-tint border-brand-tint-strong border',
        className,
      )}
    >
      <PulseLogo
        size={size * 0.6}
        color={solid ? '#FFFFFF' : palette.brand}
        strokeWidth={solid ? 2.4 : 2.2}
      />
    </View>
  );
}
