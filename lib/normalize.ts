import { inferGenresFromText, inferVibesFromText, normalizeTag } from './taxonomy';
import type { EventRow } from './types';

/**
 * Imported listings are raw: titles carry the venue and the date, line-ups say
 * "Unbekannt", prices arrive as strings and `category` / `vibe_tags` are often
 * empty. Everything here cleans a row up once, right after it is loaded, so the
 * rest of the app can trust the fields.
 */

const PLACEHOLDER_NAMES = new Set([
  'unbekannt',
  'unknown',
  'tba',
  'tbd',
  'na',
  'n a',
  'keine angabe',
  'diverse',
  'divers',
  'various',
  'various artists',
]);

const MONTHS =
  'januar|februar|marz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember|' +
  'january|february|march|may|june|july|october|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|okt|oct|nov|dez|dec';

const DATE_PATTERNS = [
  /\d{1,2}\s*\.\s*\d{1,2}\s*\.\s*\d{2,4}/,
  new RegExp(`\\d{1,2}\\s*\\.?\\s*(${MONTHS})\\b`),
  new RegExp(`\\b(${MONTHS})\\s+\\d{2,4}\\b`),
  /^\d{1,2}\s*\.\s*\d{1,2}\s*\.?$/,
  /^\d{4}$/,
];

const TITLE_SEPARATORS = [' — ', ' – ', ' -- ', ' - ', ' | ', ' · ', ' • ', ', '];

interface VenueProfile {
  genres: string[];
  vibes: string[];
}

/**
 * What a venue normally programmes. Used only when an event brings no tags of
 * its own, so imported tags always win.
 */
const VENUE_PROFILES: { key: string; profile: VenueProfile }[] = [
  { key: 'berghainkantine', profile: { genres: ['indie', 'rock'], vibes: ['live'] } },
  {
    key: 'berghain',
    profile: {
      genres: ['techno', 'hardtechno'],
      vibes: ['dancing', 'underground', 'afterhours'],
    },
  },
  {
    key: 'aboutblank',
    profile: { genres: ['techno', 'house'], vibes: ['dancing', 'queer', 'outdoors'] },
  },
  {
    key: 'katerblau',
    profile: { genres: ['house', 'minimal'], vibes: ['dancing', 'outdoors', 'afterhours'] },
  },
  {
    key: 'sisyphos',
    profile: { genres: ['house', 'techno'], vibes: ['dancing', 'outdoors', 'afterhours'] },
  },
  { key: 'watergate', profile: { genres: ['house', 'techno'], vibes: ['dancing'] } },
  {
    key: 'tresor',
    profile: { genres: ['techno', 'hardtechno'], vibes: ['dancing', 'underground'] },
  },
  { key: 'ritterbutzke', profile: { genres: ['house', 'techno'], vibes: ['dancing'] } },
  {
    key: 'renate',
    profile: { genres: ['house', 'techno'], vibes: ['dancing', 'underground'] },
  },
  { key: 'suicidecircus', profile: { genres: ['techno'], vibes: ['dancing', 'underground'] } },
  {
    key: 'goldengate',
    profile: { genres: ['techno', 'minimal'], vibes: ['dancing', 'afterhours'] },
  },
  { key: 'kitkatclub', profile: { genres: ['techno', 'trance'], vibes: ['dancing', 'queer'] } },
  { key: 'else', profile: { genres: ['house', 'disco'], vibes: ['dancing', 'outdoors'] } },
  {
    key: 'gretchen',
    profile: { genres: ['dnb', 'hiphop', 'dubstep'], vibes: ['dancing', 'live'] },
  },
  { key: 'diebusche', profile: { genres: ['pop', 'nineties'], vibes: ['queer', 'dancing'] } },
  { key: 'connection', profile: { genres: ['house'], vibes: ['queer', 'dancing'] } },
  { key: 'so36', profile: { genres: ['punk', 'rock'], vibes: ['live'] } },
  { key: 'hole', profile: { genres: ['metal', 'punk'], vibes: ['live'] } },
  { key: 'binuu', profile: { genres: ['indie', 'rock'], vibes: ['live'] } },
  { key: 'lido', profile: { genres: ['indie', 'rock'], vibes: ['live'] } },
  { key: 'astra', profile: { genres: ['indie', 'pop'], vibes: ['live'] } },
  { key: 'huxleysneuewelt', profile: { genres: ['rock', 'pop'], vibes: ['live'] } },
  { key: 'metropol', profile: { genres: ['pop', 'electro'], vibes: ['live', 'dancing'] } },
  {
    key: 'privatclub',
    profile: { genres: ['indie', 'rock', 'hiphop'], vibes: ['live', 'dancing'] },
  },
  {
    key: 'badehaus',
    profile: { genres: ['indie', 'latin', 'soul'], vibes: ['live', 'dancing'] },
  },
  { key: 'bflat', profile: { genres: ['jazz'], vibes: ['live', 'chill'] } },
  { key: 'quasimodo', profile: { genres: ['jazz', 'soul', 'funk'], vibes: ['live', 'chill'] } },
  { key: 'sodaclub', profile: { genres: ['pop', 'nineties', 'latin'], vibes: ['dancing'] } },
  { key: 'festsaalkreuzberg', profile: { genres: ['indie', 'rock'], vibes: ['live'] } },
  {
    key: 'cassiopeia',
    profile: { genres: ['punk', 'rock', 'hiphop'], vibes: ['live', 'dancing'] },
  },
  { key: 'yaam', profile: { genres: ['dancehall', 'afrobeats'], vibes: ['outdoors', 'live'] } },
  { key: 'columbiahalle', profile: { genres: ['rock', 'pop'], vibes: ['live'] } },
  { key: 'columbiatheater', profile: { genres: ['rock', 'pop'], vibes: ['live'] } },
  { key: 'matrix', profile: { genres: ['pop', 'hiphop'], vibes: ['dancing'] } },
  { key: 'maxxim', profile: { genres: ['pop', 'hiphop'], vibes: ['dressy', 'dancing'] } },
  { key: 'clarchens', profile: { genres: ['soul', 'pop'], vibes: ['dressy', 'live'] } },
  { key: 'ballhausberlin', profile: { genres: ['schlager', 'pop'], vibes: ['dressy', 'live'] } },
  { key: 'junctionbar', profile: { genres: ['soul', 'funk'], vibes: ['live', 'chill'] } },
  {
    key: 'duncker',
    profile: { genres: ['postpunk', 'wave'], vibes: ['dancing', 'underground'] },
  },
  { key: 'altekantine', profile: { genres: ['indie', 'pop'], vibes: ['live', 'dancing'] } },
  { key: 'blasmusik', profile: { genres: ['balkan'], vibes: ['live'] } },
].sort((left, right) => right.key.length - left.key.length);

function isDateish(segment: string): boolean {
  const value = segment
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .trim();
  return DATE_PATTERNS.some((pattern) => pattern.test(value));
}

/** True when a trailing title segment only repeats the venue or the city. */
function isVenueish(segment: string, names: (string | null | undefined)[]): boolean {
  const value = normalizeTag(segment);
  if (!value) return true;
  if (value === 'berlin') return true;

  for (const name of names) {
    const key = normalizeTag(name ?? '');
    if (key.length < 3) continue;
    if (value.includes(key)) return true;
    if (value.length >= 4 && key.includes(value)) return true;
  }
  return false;
}

/** Strips the venue and the date that imports like to append to the title. */
export function cleanTitle(title: string, names: (string | null | undefined)[]): string {
  const original = title.replace(/\s+/g, ' ').trim();
  let current = original;

  for (let round = 0; round < 4; round += 1) {
    let cut = -1;
    let separatorLength = 0;
    for (const separator of TITLE_SEPARATORS) {
      const index = current.lastIndexOf(separator);
      if (index > cut) {
        cut = index;
        separatorLength = separator.length;
      }
    }
    if (cut <= 0) break;

    const tail = current.slice(cut + separatorLength).trim();
    if (!tail) break;
    if (!isDateish(tail) && !isVenueish(tail, names)) break;

    current = current.slice(0, cut).trim();
  }

  const trimmed = current.replace(/[\s,;:·•|–—-]+$/, '').trim();
  return trimmed.length >= 2 ? trimmed : original;
}

/** Drops placeholder line-up entries like "Unbekannt". */
export function cleanLineup(lineup: string[] | null): string[] {
  if (!lineup?.length) return [];
  return lineup
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry) => !PLACEHOLDER_NAMES.has(flattenName(entry)));
}

function flattenName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** PostgREST can hand numerics back as strings — make them numbers again. */
export function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function venueProfile(names: (string | null | undefined)[]): VenueProfile | null {
  for (const name of names) {
    const key = normalizeTag(name ?? '');
    if (key.length < 3) continue;
    const hit = VENUE_PROFILES.find((entry) => key.includes(entry.key));
    if (hit) return hit.profile;
  }
  return null;
}

/**
 * Genres and vibes a venue is known for, or an empty list when it is not in the
 * table. Used to give a house a fitting stand-in photo.
 */
export function venueTags(name: string | null | undefined): string[] {
  const profile = venueProfile([name]);
  return profile ? unique([...profile.genres, ...profile.vibes]) : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Cleans one feed row and, when the import brought no tags, derives genres and
 * vibes from the title plus what the venue usually programmes. Imported tags
 * always take precedence.
 */
export function normalizeEvent(row: EventRow): EventRow {
  const names = [row.venue_name, row.organizer_name];
  const title = cleanTitle(row.title ?? '', names);
  const lineup = cleanLineup(row.lineup);

  const priceMin = toNumber(row.price_min);
  const priceMax = toNumber(row.price_max);
  const isFree = row.is_free ?? (priceMin === 0 || priceMax === 0 ? true : null);

  const importedGenres = row.category?.filter(Boolean) ?? [];
  const importedVibes = row.vibe_tags?.filter(Boolean) ?? [];

  let category = importedGenres;
  let vibeTags = importedVibes;
  let inferred = false;

  if (!importedGenres.length || !importedVibes.length) {
    const text = [title, row.venue_name, row.organizer_name, lineup.join(' ')]
      .filter(Boolean)
      .join(' ');
    const profile = venueProfile(names);

    if (!importedGenres.length) {
      const fromText = inferGenresFromText(text);
      const merged = fromText.length ? fromText : (profile?.genres ?? []);
      if (merged.length) {
        category = merged;
        inferred = true;
      }
    }
    if (!importedVibes.length) {
      const fromText = inferVibesFromText(text);
      const merged = unique(fromText.length ? fromText : (profile?.vibes ?? []));
      if (merged.length) {
        vibeTags = merged;
        inferred = true;
      }
    }
  }

  return {
    ...row,
    title,
    lineup,
    price_min: priceMin,
    price_max: priceMax,
    is_free: isFree,
    category,
    vibe_tags: vibeTags,
    tags_inferred: inferred,
  };
}
