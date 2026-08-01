import { useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, ExternalLink, MapPin, Ticket, X } from 'lucide-react-native';

import MapView from '@/components/MapView';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { useEventFeed } from '@/hooks/useEvents';
import { palette } from '@/lib/colors';
import { formatDateTime, formatPrice, formatTime } from '@/lib/dates';
import { INTEREST_LABELS, VIBE_LABELS, resolveInterests, resolveVibes } from '@/lib/taxonomy';

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View className={last ? 'flex-row gap-3 py-3.5' : 'border-line flex-row gap-3 border-b py-3.5'}>
      <View className="bg-brand-tint mt-0.5 h-7 w-7 items-center justify-center rounded-full">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-ink-faint text-[11px] font-semibold tracking-[1px] uppercase">
          {label}
        </Text>
        <Text className="text-ink mt-0.5 text-[14px] leading-[20px]">{value}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  primary = false,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={
        primary
          ? 'bg-brand flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 active:opacity-80'
          : 'border-line bg-card flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3.5 active:opacity-80'
      }
    >
      {icon}
      <Text
        className={
          primary ? 'text-[14px] font-semibold text-white' : 'text-ink text-[14px] font-semibold'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useEventFeed();

  const event = useMemo(() => data?.events.find((entry) => entry.id === id), [data?.events, id]);

  if (!event) {
    return (
      <SafeAreaView className="bg-canvas flex-1 items-center justify-center px-8">
        <Text className="text-ink-soft text-center text-[15px]">
          Dieses Event ist nicht mehr verfügbar.
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          className="bg-brand mt-4 rounded-xl px-5 py-3 active:opacity-80"
        >
          <Text className="text-[14px] font-semibold text-white">Zurück</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const interestTags = resolveInterests(event.category).map((tag) => INTEREST_LABELS[tag] ?? tag);
  const vibeTags = resolveVibes(event.vibe_tags).map((tag) => VIBE_LABELS[tag] ?? tag);
  const tags = [...new Set([...interestTags, ...vibeTags])];
  const lineup = event.lineup?.filter(Boolean) ?? [];

  const timeValue = event.ends_at
    ? `${formatDateTime(event.starts_at)} – ${formatTime(event.ends_at)}`
    : formatDateTime(event.starts_at);

  const openMaps = () => {
    const query = event.address ?? event.venue_name ?? '';
    const url =
      event.latitude != null && event.longitude != null
        ? Platform.select({
            ios: `http://maps.apple.com/?ll=${event.latitude},${event.longitude}&q=${encodeURIComponent(event.venue_name ?? 'Event')}`,
            default: `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`,
          })
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    void Linking.openURL(url);
  };

  const ticketUrl = event.ticket_url ?? event.source_url ?? event.venue_homepage;

  return (
    <View className="bg-canvas flex-1">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[palette.brandDeep, palette.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="pt-safe-offset-4 px-5 pb-7"
        >
          <View className="flex-row justify-end">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Schließen"
              onPress={() => router.back()}
              className="h-9 w-9 items-center justify-center rounded-full bg-white/20 active:opacity-70"
            >
              <X color="#FFFFFF" size={18} />
            </Pressable>
          </View>

          <Text className="mt-4 text-[12px] font-semibold tracking-[1.4px] text-white/70 uppercase">
            {event.district ?? 'Berlin'}
          </Text>
          <Text className="mt-1.5 text-[28px] leading-[33px] font-bold tracking-[-0.6px] text-white">
            {event.title}
          </Text>
          <Text className="mt-2 text-[15px] text-white/85">{event.venue_name ?? 'Berlin'}</Text>
        </LinearGradient>

        {tags.length ? (
          <View className="flex-row flex-wrap gap-2 px-5 pt-5">
            {tags.map((tag) => (
              <View key={tag} className="bg-brand-tint rounded-full px-3 py-1.5">
                <Text className="text-brand text-[12px] font-medium capitalize">{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {event.description_ours ? (
          <Text className="text-ink-soft px-5 pt-5 text-[15px] leading-[23px]">
            {event.description_ours}
          </Text>
        ) : null}

        <View className="border-line bg-card mx-5 mt-6 rounded-2xl border px-4 pt-1 pb-1">
          <InfoRow
            icon={<Clock color={palette.brand} size={14} />}
            label="Wann"
            value={timeValue}
          />
          <InfoRow
            icon={<MapPin color={palette.brand} size={14} />}
            label="Wo"
            value={[event.venue_name, event.address].filter(Boolean).join(', ') || 'Berlin'}
          />
          <View className="border-b-0">
            <InfoRow
              icon={<Ticket color={palette.brand} size={14} />}
              label="Eintritt"
              value={formatPrice(event.price_min, event.price_max, event.is_free)}
              last={lineup.length === 0}
            />
          </View>
          {lineup.length ? (
            <InfoRow
              icon={<Text className="text-brand text-[11px] font-bold">DJ</Text>}
              label="Line-up"
              value={lineup.join(', ')}
              last
            />
          ) : null}
        </View>

        <View className="flex-row gap-2.5 px-5 pt-5">
          {ticketUrl ? (
            <ActionButton
              primary
              label="Tickets & Infos"
              icon={<ExternalLink color="#FFFFFF" size={16} />}
              onPress={() => void Linking.openURL(ticketUrl)}
            />
          ) : null}
          <ActionButton
            label="Route"
            icon={<MapPin color={palette.ink} size={16} />}
            onPress={openMaps}
          />
        </View>

        {event.latitude != null && event.longitude != null ? (
          <View className="border-line mx-5 mt-5 overflow-hidden rounded-2xl border">
            <MapView
              style={{ height: 180 }}
              initialRegion={{
                latitude: event.latitude,
                longitude: event.longitude,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
              }}
              markers={[
                {
                  id: event.id,
                  coordinate: { latitude: event.latitude, longitude: event.longitude },
                  title: event.venue_name ?? event.title,
                  color: palette.brand,
                },
              ]}
              scrollEnabled={false}
              zoomEnabled={false}
              showsCompass={false}
              showsScale={false}
              showsMyLocationButton={false}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
