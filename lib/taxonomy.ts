/**
 * Canonical vocabulary for interests (music/programme) and vibes.
 *
 * `aliases` are matched against the raw `category` / `vibe_tags` values that
 * come from Supabase, so imported data does not have to use the exact ids.
 */

export interface Interest {
  id: string;
  label: string;
  group: 'Elektronisch' | 'Gitarren & Live' | 'Urban & Groove' | 'Programm';
  aliases: string[];
}

export interface Vibe {
  id: string;
  label: string;
  hint: string;
  aliases: string[];
}

export const INTERESTS: Interest[] = [
  {
    id: 'techno',
    label: 'Techno',
    group: 'Elektronisch',
    aliases: ['techno', 'hardtechno', 'hardgroove', 'industrial', 'rave', 'electronic', 'elektro'],
  },
  {
    id: 'house',
    label: 'House',
    group: 'Elektronisch',
    aliases: ['house', 'deephouse', 'techhouse', 'disco', 'italodisco', 'nudisco'],
  },
  {
    id: 'electro',
    label: 'Electro & Wave',
    group: 'Elektronisch',
    aliases: ['electro', 'ebm', 'wave', 'darkwave', 'synth', 'synthpop', 'newbeat'],
  },
  {
    id: 'dnb',
    label: 'Drum & Bass',
    group: 'Elektronisch',
    aliases: ['dnb', 'drumandbass', 'drumnbass', 'jungle', 'breakbeat', 'bass', 'dubstep'],
  },
  {
    id: 'ambient',
    label: 'Ambient & Experimental',
    group: 'Elektronisch',
    aliases: ['ambient', 'experimental', 'drone', 'modular', 'noise', 'idm'],
  },
  {
    id: 'indie',
    label: 'Indie',
    group: 'Gitarren & Live',
    aliases: ['indie', 'indierock', 'indiepop', 'alternative', 'shoegaze', 'dreampop'],
  },
  {
    id: 'rock',
    label: 'Rock',
    group: 'Gitarren & Live',
    aliases: ['rock', 'garage', 'psych', 'classicrock', 'postrock'],
  },
  {
    id: 'punk',
    label: 'Punk & Metal',
    group: 'Gitarren & Live',
    aliases: ['punk', 'hardcore', 'metal', 'postpunk', 'emo'],
  },
  {
    id: 'pop',
    label: 'Pop',
    group: 'Gitarren & Live',
    aliases: ['pop', 'schlager', 'charts', 'hits', '2000s', '90s', '80s'],
  },
  {
    id: 'hiphop',
    label: 'Hip-Hop & Rap',
    group: 'Urban & Groove',
    aliases: ['hiphop', 'rap', 'trap', 'drill', 'grime', 'rnb'],
  },
  {
    id: 'soulfunk',
    label: 'Soul & Funk',
    group: 'Urban & Groove',
    aliases: ['soul', 'funk', 'motown', 'boogie', 'jazzfunk'],
  },
  {
    id: 'jazz',
    label: 'Jazz',
    group: 'Urban & Groove',
    aliases: ['jazz', 'nujazz', 'bigband', 'improv'],
  },
  {
    id: 'global',
    label: 'Latin & Afro',
    group: 'Urban & Groove',
    aliases: ['latin', 'reggaeton', 'baile', 'afrobeats', 'afrohouse', 'amapiano', 'balkan'],
  },
  {
    id: 'queer',
    label: 'Queer Party',
    group: 'Programm',
    aliases: ['queer', 'lgbtq', 'gay', 'lesbian', 'drag', 'ballroom'],
  },
  {
    id: 'livekonzert',
    label: 'Live-Konzert',
    group: 'Programm',
    aliases: ['konzert', 'concert', 'live', 'livemusic', 'livemusik', 'gig', 'band'],
  },
  {
    id: 'kultur',
    label: 'Comedy & Kultur',
    group: 'Programm',
    aliases: ['comedy', 'standup', 'lesung', 'poetry', 'performance', 'kunst', 'quiz', 'karaoke'],
  },
];

export const VIBES: Vibe[] = [
  {
    id: 'tanzen',
    label: 'Tanzen',
    hint: 'Durchtanzen bis früh',
    aliases: ['tanzen', 'dancing', 'dancefloor', 'club', 'rave', 'party', 'feiern'],
  },
  {
    id: 'chill',
    label: 'Chillen',
    hint: 'Reden, trinken, ankommen',
    aliases: ['chill', 'chillen', 'relaxed', 'cozy', 'gemuetlich', 'lounge', 'bar', 'apero'],
  },
  {
    id: 'live',
    label: 'Live erleben',
    hint: 'Bühne, Band, Publikum',
    aliases: ['live', 'konzert', 'concert', 'bühne', 'buehne', 'gig', 'showcase'],
  },
  {
    id: 'underground',
    label: 'Underground',
    hint: 'Rau, dunkel, ungeschliffen',
    aliases: ['underground', 'raw', 'dark', 'dunkel', 'basement', 'diy', 'industrial'],
  },
  {
    id: 'schick',
    label: 'Schick',
    hint: 'Stylish ausgehen',
    aliases: ['schick', 'stylish', 'fancy', 'elegant', 'dresscode', 'rooftop', 'cocktail'],
  },
  {
    id: 'kennenlernen',
    label: 'Leute treffen',
    hint: 'Offen für neue Gesichter',
    aliases: ['social', 'kennenlernen', 'community', 'meetup', 'friendly', 'mixer', 'quiz'],
  },
  {
    id: 'draussen',
    label: 'Draußen',
    hint: 'Open Air & Garten',
    aliases: ['openair', 'draussen', 'outdoor', 'garten', 'garden', 'terrasse', 'boat'],
  },
  {
    id: 'afterhour',
    label: 'Afterhour',
    hint: 'Weitermachen am Morgen',
    aliases: ['afterhour', 'after', 'sunday', 'longnight', '24h', 'earlybird'],
  },
];

export const BERLIN_DISTRICTS = [
  'Mitte',
  'Kreuzberg',
  'Friedrichshain',
  'Neukölln',
  'Prenzlauer Berg',
  'Wedding',
  'Charlottenburg',
  'Schöneberg',
  'Treptow',
  'Lichtenberg',
] as const;

const UMLAUTS: Record<string, string> = {
  ä: 'a',
  ö: 'o',
  ü: 'u',
  ß: 'ss',
};

/** Lowercases, strips umlauts and every non-alphanumeric character. */
export function normalizeTag(value: string): string {
  return value
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => UMLAUTS[char] ?? char)
    .replace(/[^a-z0-9]/g, '');
}

function buildLookup(items: { id: string; aliases: string[] }[]) {
  const lookup = new Map<string, string>();
  for (const item of items) {
    lookup.set(normalizeTag(item.id), item.id);
    for (const alias of item.aliases) {
      lookup.set(normalizeTag(alias), item.id);
    }
  }
  return lookup;
}

const INTEREST_LOOKUP = buildLookup(INTERESTS);
const VIBE_LOOKUP = buildLookup(VIBES);

function resolve(lookup: Map<string, string>, tags: string[] | null | undefined): string[] {
  if (!tags?.length) return [];
  const resolved = new Set<string>();
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized) continue;
    const direct = lookup.get(normalized);
    if (direct) {
      resolved.add(direct);
      continue;
    }
    // Fall back to substring matching, e.g. "melodic-techno" -> techno.
    for (const [alias, id] of lookup) {
      if (alias.length >= 4 && normalized.includes(alias)) {
        resolved.add(id);
        break;
      }
    }
  }
  return [...resolved];
}

/** Maps raw `category` values onto canonical interest ids. */
export function resolveInterests(tags: string[] | null | undefined): string[] {
  return resolve(INTEREST_LOOKUP, tags);
}

/** Maps raw `vibe_tags` values onto canonical vibe ids. */
export function resolveVibes(tags: string[] | null | undefined): string[] {
  return resolve(VIBE_LOOKUP, tags);
}

export const INTEREST_LABELS: Record<string, string> = Object.fromEntries(
  INTERESTS.map((interest) => [interest.id, interest.label]),
);

export const VIBE_LABELS: Record<string, string> = Object.fromEntries(
  VIBES.map((vibe) => [vibe.id, vibe.label]),
);

export const INTEREST_GROUPS = [
  'Elektronisch',
  'Gitarren & Live',
  'Urban & Groove',
  'Programm',
] as const;
