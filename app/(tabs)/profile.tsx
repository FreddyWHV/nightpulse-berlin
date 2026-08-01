import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Input, Label, Switch, TextField } from 'heroui-native';
import { RotateCcw, Sparkles } from 'lucide-react-native';

import { PulseBadge } from '@/components/PulseLogo';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectChip } from '@/components/SelectChip';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { palette } from '@/lib/colors';
import { useProfileStore } from '@/lib/profileStore';
import { BERLIN_DISTRICTS, GENRE_GROUPS, GENRES } from '@/lib/taxonomy';

const BUDGETS: { label: string; value: number | null }[] = [
  { label: 'Any', value: null },
  { label: 'Up to €10', value: 10 },
  { label: 'Up to €20', value: 20 },
  { label: 'Up to €30', value: 30 },
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
      <Text className="text-ink text-[17px] font-semibold tracking-[-0.3px]">{title}</Text>
      {caption ? (
        <Text className="text-ink-soft mt-1 text-[13px] leading-[18px]">{caption}</Text>
      ) : null}
      <View className="mt-3.5">{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const displayName = useProfileStore((state) => state.displayName);
  const genres = useProfileStore((state) => state.genres);
  const districts = useProfileStore((state) => state.districts);
  const maxPrice = useProfileStore((state) => state.maxPrice);
  const freeOnly = useProfileStore((state) => state.freeOnly);

  const setDisplayName = useProfileStore((state) => state.setDisplayName);
  const toggleGenre = useProfileStore((state) => state.toggleGenre);
  const toggleDistrict = useProfileStore((state) => state.toggleDistrict);
  const setMaxPrice = useProfileStore((state) => state.setMaxPrice);
  const setFreeOnly = useProfileStore((state) => state.setFreeOnly);
  const reset = useProfileStore((state) => state.reset);

  const stats = [
    { label: 'Genres', value: String(genres.length) },
    { label: 'Districts', value: String(districts.length || BERLIN_DISTRICTS.length) },
    { label: 'Budget', value: maxPrice == null ? 'Any' : `€${maxPrice}` },
  ];

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
            overline="Profile"
            title={displayName ? `Hey, ${displayName}` : 'Your music taste'}
            subtitle="Genres, districts and budget shape the feed and the map."
            right={<PulseBadge size={40} />}
          />

          <View className="border-line bg-card mx-5 flex-row gap-2 rounded-3xl border p-4">
            {stats.map((stat) => (
              <View key={stat.label} className="flex-1">
                <Text className="text-brand text-[22px] font-semibold">{stat.value}</Text>
                <Text className="text-ink-soft mt-0.5 text-[12px]">{stat.label}</Text>
              </View>
            ))}
          </View>

          <View className="border-brand-tint-strong bg-brand-tint mx-5 mt-3 flex-row gap-3 rounded-3xl border p-4">
            <Sparkles color={palette.brand} size={18} />
            <View className="flex-1">
              <Text className="text-brand text-[14px] font-semibold">Vibes live on the feed</Text>
              <Text className="text-ink-soft mt-0.5 text-[12.5px] leading-[18px]">
                Music genres are the lasting part and stay here. What you feel like tonight is
                picked at the top of the feed and the map.
              </Text>
            </View>
          </View>

          <Section title="Name" caption="Optional, only used for the greeting.">
            <TextField>
              <Label>What should we call you?</Label>
              <Input
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Mara"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
              />
            </TextField>
          </Section>

          <Section
            title="Music genres"
            caption="Strictly music — pick everything you would dance to or watch live."
          >
            <View className="gap-5">
              {GENRE_GROUPS.map((group) => (
                <View key={group}>
                  <Text className="text-ink-faint mb-2.5 text-[11px] font-semibold tracking-[1.2px] uppercase">
                    {group}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {GENRES.filter((genre) => genre.group === group).map((genre) => (
                      <SelectChip
                        key={genre.id}
                        label={genre.label}
                        size="sm"
                        selected={genres.includes(genre.id)}
                        onPress={() => toggleGenre(genre.id)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Districts" caption="No selection means all of Berlin.">
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

          <Section title="Budget" caption="Hides events above your limit.">
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

            <View className="border-line bg-card mt-4 flex-row items-center justify-between rounded-3xl border px-4 py-3.5">
              <View className="flex-1 pr-3">
                <Text className="text-ink text-[14px] font-semibold">Free events only</Text>
                <Text className="text-ink-soft mt-0.5 text-[12px]">
                  Shows nights without an entry fee.
                </Text>
              </View>
              <Switch isSelected={freeOnly} onSelectedChange={setFreeOnly}>
                <Switch.Thumb />
              </Switch>
            </View>
          </Section>

          <View className="px-5 pt-8">
            <Pressable
              accessibilityRole="button"
              onPress={reset}
              className="border-line bg-card flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 active:opacity-70"
            >
              <RotateCcw color={palette.inkSoft} size={15} />
              <Text className="text-ink-soft text-[13.5px] font-semibold">Reset profile</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
