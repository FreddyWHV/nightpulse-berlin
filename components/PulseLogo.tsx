import { View } from 'react-native';

import { Circle, Svg } from '@/components/ui/primitives/Svg';
import { palette } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface PulseLogoProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * The NightPulse mark: a radar — solid core with rings travelling outwards.
 */
export function PulseLogo({
  size = 22,
  color = palette.brandInk,
  strokeWidth = 1.7,
}: PulseLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx={12}
        cy={12}
        r={10.2}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.22}
      />
      <Circle
        cx={12}
        cy={12}
        r={6.9}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.45}
      />
      <Circle
        cx={12}
        cy={12}
        r={3.7}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.75}
      />
      <Circle cx={12} cy={12} r={1.9} fill={color} />
    </Svg>
  );
}

interface PulseBadgeProps {
  /** Diameter of the round badge. */
  size?: number;
  /** `tint` = mint mark on a light tint, `solid` = dark mark on mint. */
  tone?: 'tint' | 'solid';
  className?: string;
}

/** Round container for the radar mark, used as the app logo in headers. */
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
        size={size * 0.66}
        color={solid ? palette.onBrand : palette.brandInk}
        strokeWidth={solid ? 1.9 : 1.7}
      />
    </View>
  );
}
