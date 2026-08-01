import { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Input, Label, Switch, TextField } from 'heroui-native';
import { RotateCcw } from 'lucide-react-native';

import { FavoriteButton } from '@/components/FavoriteButton';
import { PulseBadge } from '@/components/PulseLogo';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectChip } from '@/components/SelectChip';
import { useTabBarClearance } from '@/components/FloatingTabBar';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { mockAvatarFor } from '@/lib/avatars';
import { palette } from '@/lib/colors';
import { sortFavorites, useFavoritesStore } from '@/lib/favoritesStore';
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
  const hydrated = useProfileStore((state) => state.hydrated);
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

  const favoriteItems = useFavoritesStore((state) => state.items);
  const favoritesHydrated = useFavoritesStore((state) => state.hydrated);
  const favorites = useMemo(() => sortFavorites(favoriteItems), [favoriteItems]);

  const tabBarClearance = useTabBarClearance();

  const summary = [
    genres.length
      ? `${genres.length} ${genres.length === 1 ? 'genre' : 'genres'}`
      : 'No genres yet',
    favorites.length ? `${favorites.length} saved` : null,
    districts.length ? `${districts.length} districts` : 'All of Berlin',
    maxPrice == null ? 'Any budget' : `Up to €${maxPrice}`,
  ]
    .filter(Boolean)
    .join(' · ');

  if (!hydrated || !favoritesHydrated) {
    return (
      <SafeAreaView edges={['top']} className="bg-canvas flex-1 items-center justify-center">
        <ActivityIndicator color={palette.brandInk} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="bg-canvas flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarClearance + 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            overline="Profile"
            title={displayName ? `Hey, ${displayName}` : 'Your music taste'}
            subtitle={summary}
            right={<PulseBadge size={40} />}
          />

          <Text className="text-ink-faint px-5 text-[12.5px] leading-[18px]">
            Saved on this device — your genres are still here after a reload. Tonight&apos;s vibe is
            picked at the top of the feed instead.
          </Text>

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
            title="Saved organisers"
            caption="Hearted venues and promoters always land in your kind of night."
          >
            {favorites.length ? (
              <View className="border-line border-t">
                {favorites.map((favorite) => (
                  <View
                    key={favorite.key}
                    className="border-line flex-row items-center gap-3 border-b py-3"
                  >
                    <Image
                      source={
                        favorite.imageUrl
                          ? { uri: favorite.imageUrl }
                          : mockAvatarFor(favorite.name)
                      }
                      style={{ width: 38, height: 38, borderRadius: 19 }}
                      resizeMode="cover"
                      className="bg-surface"
                    />
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-ink text-[14.5px] font-semibold">
                        {favorite.name}
                      </Text>
                      <Text className="text-ink-soft mt-0.5 text-[12px]">
                        {favorite.district ?? 'Berlin'}
                      </Text>
                    </View>
                    <FavoriteButton
                      name={favorite.name}
                      district={favorite.district}
                      imageUrl={favorite.imageUrl}
                      size={32}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-ink-soft text-[13px] leading-[19px]">
                Nothing saved yet. Tap the heart on an event or on a place on the map to follow its
                organiser.
              </Text>
            )}
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

            <View className="border-line mt-5 flex-row items-center justify-between border-t pt-4">
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
              className="flex-row items-center gap-2 self-start active:opacity-60"
            >
              <RotateCcw color={palette.inkFaint} size={14} />
              <Text className="text-ink-faint text-[13px] font-semibold">Reset profile</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
