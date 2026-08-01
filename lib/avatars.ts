import venue01 from '@/assets/organizers/venue-01.png';
import venue02 from '@/assets/organizers/venue-02.png';
import venue03 from '@/assets/organizers/venue-03.png';
import venue04 from '@/assets/organizers/venue-04.png';
import venue05 from '@/assets/organizers/venue-05.png';
import venue06 from '@/assets/organizers/venue-06.png';

/**
 * Stand-in profile pictures for venues and promoters.
 *
 * The imported `sources` rows carry no `image_url` yet, and showing initials
 * instead looked like a placeholder. Until real photos land, every organiser
 * gets one of these nightlife shots — always the same one for the same name, so
 * a venue keeps its face across feed, map and detail screen.
 */
const MOCK_AVATARS = [venue01, venue02, venue03, venue04, venue05, venue06] as const;

/** Stable, order-independent hash of the organiser name. */
function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 100000;
  }
  return result;
}

export function mockAvatarFor(name: string | null | undefined) {
  const key = (name ?? 'berlin').trim().toLowerCase();
  return MOCK_AVATARS[hash(key) % MOCK_AVATARS.length];
}
