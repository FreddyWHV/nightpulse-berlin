import { Text, View } from 'react-native';

interface ScreenHeaderProps {
  overline: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ overline, title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-end justify-between px-5 pt-2 pb-4">
      <View className="flex-1 pr-3">
        <Text className="text-brand-ink text-[11px] font-semibold tracking-[1.4px] uppercase">
          {overline}
        </Text>
        <Text className="text-ink mt-1 text-[26px] leading-[30px] font-bold tracking-[-0.5px]">
          {title}
        </Text>
        {subtitle ? <Text className="text-ink-soft mt-1 text-[13px]">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
