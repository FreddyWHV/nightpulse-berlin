import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PulseLogo } from '@/components/PulseLogo';
import { SelectChip } from '@/components/SelectChip';
import { AnimatedView } from '@/components/ui/primitives/AnimatedView';
import { palette } from '@/lib/colors';
import { useFilterStore } from '@/lib/filterStore';
import { VIBES } from '@/lib/taxonomy';

const CORE_SIZE = 66;
/** How far a ring travels before it disappears, as a multiple of the core. */
const RING_REACH = 3.3;
/** One full loop emits three rings, one every 800 ms. */
const CYCLE_MS = 2400;
const STAGE_SIZE = Math.round(CORE_SIZE * RING_REACH) + 16;

/**
 * One outgoing ring. `phase` staggers it inside the loop and the travel curve is
 * eased out, so the ring slows down while it fades — like a radar sweep.
 */
function ringStyle(driver: number, phase: number) {
  'worklet';
  const progress = (driver + phase) % 1;
  const eased = 1 - (1 - progress) * (1 - progress);
  return {
    opacity: interpolate(progress, [0, 0.1, 0.75, 1], [0, 0.5, 0.12, 0]),
    transform: [{ scale: 1 + eased * (RING_REACH - 1) }],
  };
}

/**
 * Launch screen: the radar mark sends rings outwards and asks for tonight's mood.
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
    // Linear driver: rings need to leave the core at an even rhythm.
    pulse.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
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

  const ringOne = useAnimatedStyle(() => ringStyle(pulse.value, 0));
  const ringTwo = useAnimatedStyle(() => ringStyle(pulse.value, 1 / 3));
  const ringThree = useAnimatedStyle(() => ringStyle(pulse.value, 2 / 3));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.cos(pulse.value * Math.PI * 6), [-1, 1], [0.18, 0.4]),
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.04 * Math.cos(pulse.value * Math.PI * 6) }],
  }));

  if (!visible) return null;

  const ringBase = {
    position: 'absolute' as const,
    height: CORE_SIZE,
    width: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: palette.brand,
  };

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
          style={{ height: STAGE_SIZE, width: STAGE_SIZE }}
          className="items-center justify-center"
        >
          <AnimatedView
            style={[
              {
                position: 'absolute',
                height: CORE_SIZE * 1.7,
                width: CORE_SIZE * 1.7,
                borderRadius: CORE_SIZE,
              },
              haloStyle,
            ]}
            className="bg-brand-tint"
          />
          <AnimatedView style={[ringBase, ringThree]} />
          <AnimatedView style={[ringBase, ringTwo]} />
          <AnimatedView style={[ringBase, ringOne]} />
          <AnimatedView
            style={[
              { height: CORE_SIZE, width: CORE_SIZE, borderRadius: CORE_SIZE / 2 },
              coreStyle,
            ]}
            className="bg-brand items-center justify-center"
          >
            <PulseLogo size={CORE_SIZE * 0.58} color={palette.onBrand} strokeWidth={1.8} />
          </AnimatedView>
        </View>

        <Text className="text-brand-ink mt-2 text-[11px] font-semibold tracking-[1.6px] uppercase">
          NightPulse Berlin
        </Text>
        <Text className="text-ink mt-2 text-center text-[28px] leading-[33px] font-semibold tracking-[-0.7px]">
          What are you up for today?
        </Text>
        <Text className="text-ink-soft mt-2 max-w-[320px] text-center text-[14px] leading-[20px]">
          Pick tonight&apos;s mood. Your music taste stays in your profile.
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
