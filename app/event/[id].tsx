import { useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, ExternalLink, MapPin, Ticket, X } from 'lucide-react-native';

import { EventCover } from '@/components/EventCover';
import { OrganizerBadge } from '@/components/OrganizerBadge';
import MapView from '@/components/MapView';
import { SafeAreaView } from '@/components/ui/primitives/SafeAreaView';
import { useEventFeed } from '@/hooks/useEvents';
import { palette } from '@/lib/colors';
import { formatDateTime, formatPrice, formatTime } from '@/lib/dates';
import { GENRE_LABELS, VIBE_LABELS, resolveGenres, resolveVibes } from '@/lib/taxonomy';

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
          ? 'bg-brand flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3.5 active:opacity-80'
          : 'border-line bg-card flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 active:opacity-80'
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
          This event is not available any more.
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          className="bg-brand mt-4 rounded-2xl px-5 py-3 active:opacity-80"
        >
          <Text className="text-[14px] font-semibold text-white">Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const tags = [
    ...new Set([
      ...resolveGenres(event.category).map((tag) => GENRE_LABELS[tag] ?? tag),
      ...resolveVibes(event.vibe_tags).map((tag) => VIBE_LABELS[tag] ?? tag),
    ]),
  ];
  const lineup = event.lineup?.filter(Boolean) ?? [];
  const organizer = event.organizer_name ?? event.venue_name;

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
        <View className="pt-safe-offset-3 px-4">
          <EventCover event={event} height={220} rounded="rounded-3xl" monogramSize={34} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            className="absolute top-3 right-3 h-9 w-9 items-center justify-center rounded-full bg-black/45 active:opacity-70"
          >
            <X color="#FFFFFF" size={18} />
          </Pressable>
          {event.image_source ? (
            <Text className="text-ink-faint mt-1.5 px-1 text-[10.5px]">
              Photo: {event.image_source}
            </Text>
          ) : null}
        </View>

        <View className="px-5 pt-5">
          <Text className="text-brand text-[11px] font-semibold tracking-[1.4px] uppercase">
            {[event.district ?? 'Berlin', formatTime(event.starts_at)].join(' · ')}
          </Text>
          <Text className="text-ink mt-1.5 text-[26px] leading-[31px] font-semibold tracking-[-0.6px]">
            {event.title}
          </Text>

          <View className="border-line bg-card mt-4 rounded-3xl border p-4">
            <OrganizerBadge
              name={organizer}
              imageUrl={event.organizer_image_url}
              size={38}
              textClassName="text-ink text-[14px] font-semibold"
            />
            <Text className="text-ink-soft mt-2 text-[12.5px] leading-[18px]">
              {[event.venue_name, event.address].filter(Boolean).join(', ') || 'Berlin'}
            </Text>
            {event.venue_homepage ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL(event.venue_homepage ?? '')}
                className="mt-2 self-start active:opacity-70"
              >
                <Text className="text-brand text-[12.5px] font-semibold">Open website</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {tags.length ? (
          <View className="flex-row flex-wrap gap-2 px-5 pt-4">
            {tags.map((tag) => (
              <View key={tag} className="bg-surface rounded-full px-3 py-1.5">
                <Text className="text-ink-soft text-[12px] font-medium capitalize">{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {event.description_ours ? (
          <Text className="text-ink-soft px-5 pt-4 text-[15px] leading-[23px]">
            {event.description_ours}
          </Text>
        ) : null}

        <View className="border-line bg-card mx-5 mt-5 rounded-3xl border px-4">
          <InfoRow
            icon={<Clock color={palette.brand} size={14} />}
            label="When"
            value={timeValue}
          />
          <InfoRow
            icon={<MapPin color={palette.brand} size={14} />}
            label="Where"
            value={[event.venue_name, event.district].filter(Boolean).join(' · ') || 'Berlin'}
          />
          <InfoRow
            icon={<Ticket color={palette.brand} size={14} />}
            label="Entry"
            value={formatPrice(event.price_min, event.price_max, event.is_free)}
            last={lineup.length === 0}
          />
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
              label="Tickets & info"
              icon={<ExternalLink color="#FFFFFF" size={16} />}
              onPress={() => void Linking.openURL(ticketUrl)}
            />
          ) : null}
          <ActionButton
            label="Directions"
            icon={<MapPin color={palette.ink} size={16} />}
            onPress={openMaps}
          />
        </View>

        {event.latitude != null && event.longitude != null ? (
          <View className="border-line mx-5 mt-5 overflow-hidden rounded-3xl border">
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
