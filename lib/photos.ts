import type { ImageSourcePropType } from 'react-native';

import coverBar from '@/assets/covers/cover-bar.png';
import coverClub from '@/assets/covers/cover-club.png';
import coverLive from '@/assets/covers/cover-live.png';
import venue01 from '@/assets/organizers/venue-01.png';
import venue02 from '@/assets/organizers/venue-02.png';
import venue03 from '@/assets/organizers/venue-03.png';
import venue04 from '@/assets/organizers/venue-04.png';
import venue05 from '@/assets/organizers/venue-05.png';
import venue06 from '@/assets/organizers/venue-06.png';
import photoArts from '@/assets/photos/photo-arts.png';
import photoDj from '@/assets/photos/photo-dj.png';
import photoHiphop from '@/assets/photos/photo-hiphop.png';
import photoHouse from '@/assets/photos/photo-house.png';
import photoJazzLive from '@/assets/photos/photo-jazzlive.png';
import photoLatin from '@/assets/photos/photo-latin.png';
import photoMetal from '@/assets/photos/photo-metal.png';
import photoOpenAir from '@/assets/photos/photo-openair.png';
import photoPunk from '@/assets/photos/photo-punk.png';
import photoQueer from '@/assets/photos/photo-queer.png';
import photoTechno from '@/assets/photos/photo-techno.png';

import { venueTags } from './normalize';
import { resolveGenres, resolveVibes } from './taxonomy';
import type { EventRow } from './types';

/**
 * Stand-in photography for events and organisers.
 *
 * The imported rows carry neither `image_url` on the event nor on the source, so
 * every picture on screen comes from this library until real ones land. Each
 * entry is tagged with the genre and vibe ids it suits; the picker narrows the
 * library down to the matching photos and then chooses one deterministically, so
 * a list of ten rock concerts does not repeat a single photo ten times while an
 * event still keeps its picture across feed, map and detail screen.
 */
interface StockPhoto {
  readonly source: ImageSourcePropType;
  /** Genre and vibe ids from `lib/taxonomy` this photo fits. */
  readonly tags: readonly string[];
}

const LIBRARY: readonly StockPhoto[] = [
  {
    source: coverClub,
    tags: [
      'techno',
      'minimal',
      'melodictechno',
      'house',
      'techhouse',
      'trance',
      'dancing',
      'underground',
    ],
  },
  {
    source: photoTechno,
    tags: [
      'techno',
      'hardtechno',
      'minimal',
      'melodictechno',
      'electro',
      'wave',
      'underground',
      'afterhours',
      'dancing',
    ],
  },
  {
    source: venue01,
    tags: [
      'techno',
      'hardtechno',
      'electro',
      'minimal',
      'idm',
      'underground',
      'afterhours',
      'experimental',
    ],
  },
  {
    source: photoDj,
    tags: [
      'techhouse',
      'house',
      'dnb',
      'jungle',
      'dubstep',
      'ukgarage',
      'footwork',
      'electro',
      'trance',
      'hardstyle',
      'dancing',
    ],
  },
  {
    source: photoHouse,
    tags: [
      'house',
      'techhouse',
      'disco',
      'afrohouse',
      'afrobeats',
      'funk',
      'dancing',
      'social',
      'queer',
    ],
  },
  {
    source: venue04,
    tags: [
      'disco',
      'pop',
      'rnb',
      'latin',
      'nineties',
      'eighties',
      'schlager',
      'kpop',
      'dressy',
      'dancing',
    ],
  },
  {
    source: photoHiphop,
    tags: [
      'hiphop',
      'trap',
      'grime',
      'rnb',
      'dancehall',
      'bailefunk',
      'dubstep',
      'ukgarage',
      'footwork',
      'live',
    ],
  },
  {
    source: photoLatin,
    tags: ['latin', 'bailefunk', 'balkan', 'dancehall', 'afrobeats', 'social', 'dancing'],
  },
  {
    source: venue05,
    tags: ['jazz', 'soul', 'funk', 'chill', 'ambient'],
  },
  {
    source: photoJazzLive,
    tags: ['jazz', 'soul', 'funk', 'live', 'chill', 'arts'],
  },
  {
    source: coverLive,
    tags: ['indie', 'rock', 'shoegaze', 'postpunk', 'pop', 'live'],
  },
  {
    source: venue02,
    tags: ['indie', 'rock', 'shoegaze', 'balkan', 'pop', 'kpop', 'nineties', 'live'],
  },
  {
    source: photoPunk,
    tags: ['punk', 'postpunk', 'rock', 'metal', 'live', 'underground'],
  },
  {
    source: photoMetal,
    tags: ['metal', 'punk', 'rock', 'hardstyle', 'live'],
  },
  {
    source: photoQueer,
    tags: ['queer', 'dressy', 'pop', 'eighties', 'schlager', 'kpop', 'disco', 'dancing'],
  },
  {
    source: photoOpenAir,
    tags: ['outdoors', 'afrohouse', 'afrobeats', 'house', 'dancing', 'social', 'chill'],
  },
  {
    source: coverBar,
    tags: ['chill', 'social', 'outdoors', 'dressy'],
  },
  {
    source: venue03,
    tags: ['chill', 'social', 'ambient', 'wave', 'experimental'],
  },
  {
    source: photoArts,
    tags: ['arts', 'experimental', 'idm', 'ambient', 'live'],
  },
  {
    source: venue06,
    tags: [
      'dancing',
      'trance',
      'hardstyle',
      'hiphop',
      'trap',
      'grime',
      'dnb',
      'jungle',
      'techno',
      'social',
    ],
  },
];

/** FNV-1a — small, stable and well spread over a short list. */
function hash32(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193) >>> 0;
  }
  return result >>> 0;
}

function bucketFor(tags: string[]): readonly StockPhoto[] {
  if (!tags.length) return LIBRARY;
  const wanted = new Set(tags);
  const matched = LIBRARY.filter((photo) => photo.tags.some((tag) => wanted.has(tag)));
  return matched.length ? matched : LIBRARY;
}

function pick(bucket: readonly StockPhoto[], seed: string): ImageSourcePropType {
  return bucket[hash32(seed) % bucket.length].source;
}

/**
 * Stand-in cover for an event: a photo matching its genres and vibes, stable per
 * event so the same listing always shows the same picture.
 */
export function photoForEvent(event: EventRow): ImageSourcePropType {
  const tags = [...resolveGenres(event.category), ...resolveVibes(event.vibe_tags)];
  const seed = `event:${event.id ?? ''}:${event.title ?? ''}`;
  return pick(bucketFor(tags), seed);
}

/**
 * Stand-in profile picture for a venue or promoter. Uses what the house normally
 * programmes when it is known, so a jazz club does not get a rave photo, and
 * stays the same on feed, map, detail screen and profile.
 */
export function photoForOrganizer(name: string | null | undefined): ImageSourcePropType {
  const key = (name ?? 'berlin').trim().toLowerCase();
  return pick(bucketFor(venueTags(key)), `organizer:${key}`);
}
