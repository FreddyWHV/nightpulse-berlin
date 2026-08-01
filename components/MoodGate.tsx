import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PulseLogo } from '@/components/PulseLogo';
import { SelectChip } from '@/components/SelectChip';
import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { useFilterStore } from '@/lib/filterStore';
import { VIBES } from '@/lib/taxonomy';

const CORE_SIZE = 84;
const RING_GROWTH = 1.7;

/**
 * Launch screen: the pulse mark beats for a moment and asks for tonight's mood.
 * Answering applies the vibes to the shared filter and fades into the feed.
 * Shown once per app session (the flag lives in memory, not on disk).
 */
export function MoodGate() {
  const router = useRouter();
  const completeMood = useFilterStore((state) => state.completeMood);

  // Read once so the gate can play its exit animation before it unmounts.
  const [visible, setVisible] = useState(() => !useFilterStore.getState().moodAsked);
  const [selected, setSelected] = useState<string[]>([]);
  const pending = useRef<string[]>([]);

  const fade = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) return undefined;
    fade.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
    pulse.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(fade);
    };
  }, [visible, fade, pulse]);

  const close = useCallback(() => {
    completeMood(pending.current);
    setVisible(false);
    router.replace('/');
  }, [completeMood, router]);

  const finish = (vibes: string[]) => {
    pending.current = vibes;
    fade.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) runOnJS(close)();
    });
  };

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const innerRing = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * RING_GROWTH }],
  }));
  const outerRing = useAnimatedStyle(() => {
    const shifted = (pulse.value + 0.5) % 1;
    return {
      opacity: 0.45 * (1 - shifted),
      transform: [{ scale: 1 + shifted * RING_GROWTH }],
    };
  });
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.05 * Math.sin(pulse.value * Math.PI * 2) }],
  }));

  if (!visible) return null;

  return (
    <AnimatedView
      style={[StyleSheet.absoluteFillObject, fadeStyle]}
      className="bg-canvas pt-safe-offset-6 pb-safe-offset-5 justify-between px-6"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ height: CORE_SIZE * 2.4, width: CORE_SIZE * 2.4 }}
          className="items-center justify-center"
        >
          <AnimatedView
            style={[
              { height: CORE_SIZE, width: CORE_SIZE, borderRadius: CORE_SIZE / 2 },
              outerRing,
            ]}
            className="border-brand absolute border-2"
          />
          <AnimatedView
            style={[
              { height: CORE_SIZE, width: CORE_SIZE, borderRadius: CORE_SIZE / 2 },
              innerRing,
            ]}
            className="border-brand absolute border-2"
          />
          <AnimatedView
            style={[
              { height: CORE_SIZE, width: CORE_SIZE, borderRadius: CORE_SIZE / 2 },
              coreStyle,
            ]}
            className="bg-brand items-center justify-center"
          >
            <PulseLogo size={CORE_SIZE * 0.62} color="#FFFFFF" strokeWidth={1.9} />
          </AnimatedView>
        </View>

        <Text className="text-brand text-[11px] font-semibold tracking-[1.6px] uppercase">
          NightPulse Berlin
        </Text>
        <Text className="text-ink mt-2 text-center text-[28px] leading-[33px] font-semibold tracking-[-0.7px]">
          How are we feeling today?
        </Text>
        <Text className="text-ink-soft mt-2 max-w-[320px] text-center text-[14px] leading-[20px]">
          Pick what you are up for tonight. Your music taste stays in your profile — this is just
          about the mood.
        </Text>

        <View className="mt-7 w-full flex-row flex-wrap justify-center gap-2">
          {VIBES.map((vibe) => (
            <SelectChip
              key={vibe.id}
              label={vibe.label}
              hint={vibe.hint}
              selected={selected.includes(vibe.id)}
              onPress={() =>
                setSelected((current) =>
                  current.includes(vibe.id)
                    ? current.filter((entry) => entry !== vibe.id)
                    : [...current, vibe.id],
                )
              }
            />
          ))}
        </View>
      </ScrollView>

      <View className="w-full pt-4">
        <Button onPress={() => finish(selected)}>
          <Button.Label>{selected.length ? 'Show my night' : 'Show everything'}</Button.Label>
        </Button>
        <Pressable
          accessibilityRole="button"
          onPress={() => finish([])}
          className="mt-2 items-center py-2 active:opacity-60"
        >
          <Text className="text-ink-faint text-[13px] font-medium">Skip for now</Text>
        </Pressable>
      </View>
    </AnimatedView>
  );
}
