import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Input, Label, Switch, TextField } from 'heroui-native';
import { RotateCcw } from 'lucide-react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectChip } from '@/components/SelectChip';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { palette } from '@/lib/colors';
import { useProfileStore } from '@/lib/profileStore';
import { BERLIN_DISTRICTS, INTEREST_GROUPS, INTERESTS, VIBES } from '@/lib/taxonomy';

const BUDGETS: { label: string; value: number | null }[] = [
  { label: 'Egal', value: null },
  { label: 'bis 10 €', value: 10 },
  { label: 'bis 20 €', value: 20 },
  { label: 'bis 30 €', value: 30 },
];

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-7">
      <Text className="text-ink text-[17px] font-bold tracking-[-0.3px]">{title}</Text>
      {caption ? (
        <Text className="text-ink-soft mt-1 text-[13px] leading-[18px]">{caption}</Text>
      ) : null}
      <View className="mt-3.5">{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const displayName = useProfileStore((state) => state.displayName);
  const interests = useProfileStore((state) => state.interests);
  const vibes = useProfileStore((state) => state.vibes);
  const districts = useProfileStore((state) => state.districts);
  const maxPrice = useProfileStore((state) => state.maxPrice);
  const freeOnly = useProfileStore((state) => state.freeOnly);

  const setDisplayName = useProfileStore((state) => state.setDisplayName);
  const toggleInterest = useProfileStore((state) => state.toggleInterest);
  const toggleVibe = useProfileStore((state) => state.toggleVibe);
  const toggleDistrict = useProfileStore((state) => state.toggleDistrict);
  const setMaxPrice = useProfileStore((state) => state.setMaxPrice);
  const setFreeOnly = useProfileStore((state) => state.setFreeOnly);
  const reset = useProfileStore((state) => state.reset);

  return (
    <SafeAreaView edges={['top']} className="bg-canvas flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            overline="Profil"
            title={displayName ? `Moin, ${displayName}` : 'Dein Geschmack'}
            subtitle="Alles hier fließt direkt in den Feed und die Karte ein."
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profil zurücksetzen"
                onPress={reset}
                className="border-line bg-card h-9 w-9 items-center justify-center rounded-full border active:opacity-70"
              >
                <RotateCcw color={palette.inkSoft} size={15} />
              </Pressable>
            }
          />

          <View className="border-line bg-card mx-5 flex-row gap-2 rounded-2xl border p-4">
            {[
              { label: 'Interessen', value: interests.length },
              { label: 'Vibes', value: vibes.length },
              { label: 'Bezirke', value: districts.length || BERLIN_DISTRICTS.length },
            ].map((stat) => (
              <View key={stat.label} className="flex-1">
                <Text className="text-brand text-[22px] font-bold">{stat.value}</Text>
                <Text className="text-ink-soft mt-0.5 text-[12px]">{stat.label}</Text>
              </View>
            ))}
          </View>

          <Section title="Name" caption="Optional, nur für die Begrüßung.">
            <TextField>
              <Label>Wie sollen wir dich nennen?</Label>
              <Input
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="z. B. Mara"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
            </TextField>
          </Section>

          <Section
            title="Interessen"
            caption="Musikrichtungen und Programm, die dich interessieren."
          >
            <View className="gap-5">
              {INTEREST_GROUPS.map((group) => (
                <View key={group}>
                  <Text className="text-ink-faint mb-2.5 text-[11px] font-semibold tracking-[1.2px] uppercase">
                    {group}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {INTERESTS.filter((interest) => interest.group === group).map((interest) => (
                      <SelectChip
                        key={interest.id}
                        label={interest.label}
                        size="sm"
                        selected={interests.includes(interest.id)}
                        onPress={() => toggleInterest(interest.id)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Vibes" caption="Wie soll ein Abend sich anfühlen?">
            <View className="flex-row flex-wrap gap-2">
              {VIBES.map((vibe) => (
                <SelectChip
                  key={vibe.id}
                  label={vibe.label}
                  hint={vibe.hint}
                  selected={vibes.includes(vibe.id)}
                  onPress={() => toggleVibe(vibe.id)}
                />
              ))}
            </View>
          </Section>

          <Section title="Bezirke" caption="Ohne Auswahl zählt ganz Berlin.">
            <View className="flex-row flex-wrap gap-2">
              {BERLIN_DISTRICTS.map((district) => (
                <SelectChip
                  key={district}
                  label={district}
                  size="sm"
                  selected={districts.includes(district)}
                  onPress={() => toggleDistrict(district)}
                />
              ))}
            </View>
          </Section>

          <Section title="Budget" caption="Filtert Events oberhalb deines Limits aus.">
            <View className="flex-row flex-wrap gap-2">
              {BUDGETS.map((budget) => (
                <SelectChip
                  key={budget.label}
                  label={budget.label}
                  size="sm"
                  selected={maxPrice === budget.value}
                  onPress={() => setMaxPrice(budget.value)}
                />
              ))}
            </View>

            <View className="border-line bg-card mt-4 flex-row items-center justify-between rounded-2xl border px-4 py-3.5">
              <View className="flex-1 pr-3">
                <Text className="text-ink text-[14px] font-semibold">Nur kostenlose Events</Text>
                <Text className="text-ink-soft mt-0.5 text-[12px]">
                  Zeigt ausschließlich Abende ohne Eintritt.
                </Text>
              </View>
              <Switch isSelected={freeOnly} onSelectedChange={setFreeOnly}>
                <Switch.Thumb />
              </Switch>
            </View>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
