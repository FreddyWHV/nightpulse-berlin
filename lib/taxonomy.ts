/**
 * Two strictly separated vocabularies:
 *
 * - `GENRES` — music only. Chosen once in the profile.
 * - `VIBES`  — what you feel like tonight. Chosen in the feed/map top bar.
 *
 * No entry and no alias appears in both lists, so a genre can never leak into
 * the vibe filter and the other way round.
 *
 * `aliases` are matched against the raw `category` / `vibe_tags` values coming
 * from Supabase, so imported data does not have to use the exact ids.
 */

export const GENRE_GROUPS = [
  'House & Disco',
  'Techno & Electro',
  'Bass & Breaks',
  'Hip-Hop & R&B',
  'Soul, Funk & Jazz',
  'Global Grooves',
  'Guitars',
  'Pop & Classics',
  'Leftfield',
] as const;

export type GenreGroup = (typeof GENRE_GROUPS)[number];

export interface Genre {
  id: string;
  label: string;
  group: GenreGroup;
  aliases: string[];
}

export interface Vibe {
  id: string;
  label: string;
  hint: string;
  aliases: string[];
}

export const GENRES: Genre[] = [
  // House & Disco
  {
    id: 'house',
    label: 'House',
    group: 'House & Disco',
    aliases: ['house', 'deephouse', 'soulfulhouse', 'jackinhouse', 'chicagohouse', 'funkyhouse'],
  },
  {
    id: 'techhouse',
    label: 'Tech House',
    group: 'House & Disco',
    aliases: ['techhouse', 'ukhouse'],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    group: 'House & Disco',
    aliases: ['minimal', 'microhouse', 'minimalhouse', 'romanianminimal'],
  },
  {
    id: 'disco',
    label: 'Disco & Italo',
    group: 'House & Disco',
    aliases: ['disco', 'italo', 'italodisco', 'nudisco', 'discohouse', 'cosmicdisco'],
  },
  {
    id: 'afrohouse',
    label: 'Afro House & Amapiano',
    group: 'House & Disco',
    aliases: ['afrohouse', 'amapiano', 'afrotech', '3step'],
  },

  // Techno & Electro
  {
    id: 'techno',
    label: 'Techno',
    group: 'Techno & Electro',
    aliases: ['techno', 'dubtechno', 'minimaltechno', 'detroittechno'],
  },
  {
    id: 'hardtechno',
    label: 'Hard Techno',
    group: 'Techno & Electro',
    aliases: ['hardtechno', 'hardgroove', 'schranz', 'industrial', 'industrialtechno'],
  },
  {
    id: 'melodictechno',
    label: 'Melodic & Progressive',
    group: 'Techno & Electro',
    aliases: ['melodictechno', 'melodic', 'melodichouse', 'progressive', 'progressivehouse'],
  },
  {
    id: 'electro',
    label: 'Electro & EBM',
    group: 'Techno & Electro',
    aliases: ['electro', 'electronic', 'electronica', 'elektro', 'ebm', 'electroclash'],
  },
  {
    id: 'wave',
    label: 'Wave & Synth Pop',
    group: 'Techno & Electro',
    aliases: ['wave', 'darkwave', 'coldwave', 'minimalwave', 'synthwave', 'synthpop', 'newbeat'],
  },
  {
    id: 'trance',
    label: 'Trance & Psy',
    group: 'Techno & Electro',
    aliases: ['trance', 'psytrance', 'goa', 'hardtrance', 'hypertrance', 'progressivetrance'],
  },
  {
    id: 'hardstyle',
    label: 'Hardstyle & Gabber',
    group: 'Techno & Electro',
    aliases: ['hardstyle', 'gabber', 'uptempo', 'frenchcore', 'hardcoretechno', 'rawstyle'],
  },

  // Bass & Breaks
  {
    id: 'dnb',
    label: 'Drum & Bass',
    group: 'Bass & Breaks',
    aliases: ['dnb', 'drumandbass', 'drumnbass', 'liquidfunk', 'neurofunk', 'jumpup'],
  },
  {
    id: 'jungle',
    label: 'Jungle & Breakbeat',
    group: 'Bass & Breaks',
    aliases: ['jungle', 'breakbeat', 'breaks', 'bigbeat', 'amenbreak'],
  },
  {
    id: 'dubstep',
    label: 'Dubstep & Bass',
    group: 'Bass & Breaks',
    aliases: ['dubstep', 'riddim', 'bassmusic', 'wonky', 'halftime'],
  },
  {
    id: 'ukgarage',
    label: 'UK Garage & Bassline',
    group: 'Bass & Breaks',
    aliases: ['ukgarage', '2step', 'speedgarage', 'bassline', 'ukfunky'],
  },
  {
    id: 'footwork',
    label: 'Footwork & Jersey',
    group: 'Bass & Breaks',
    aliases: ['footwork', 'juke', 'ghettotech', 'jerseyclub', 'baltimore'],
  },

  // Hip-Hop & R&B
  {
    id: 'hiphop',
    label: 'Hip-Hop',
    group: 'Hip-Hop & R&B',
    aliases: ['hiphop', 'rap', 'boombap', 'oldschoolhiphop', 'deutschrap'],
  },
  {
    id: 'trap',
    label: 'Trap & Drill',
    group: 'Hip-Hop & R&B',
    aliases: ['trap', 'drill', 'phonk', 'cloudrap'],
  },
  {
    id: 'grime',
    label: 'Grime & UK Rap',
    group: 'Hip-Hop & R&B',
    aliases: ['grime', 'ukrap', 'ukdrill', 'roadrap'],
  },
  {
    id: 'rnb',
    label: 'R&B & Neo Soul',
    group: 'Hip-Hop & R&B',
    aliases: ['rnb', 'rhythmandblues', 'neosoul', 'contemporaryrnb'],
  },
  {
    id: 'dancehall',
    label: 'Dancehall & Reggae',
    group: 'Hip-Hop & R&B',
    aliases: ['dancehall', 'reggae', 'ragga', 'dub', 'roots', 'bashment'],
  },

  // Soul, Funk & Jazz
  {
    id: 'soul',
    label: 'Soul & Motown',
    group: 'Soul, Funk & Jazz',
    aliases: ['soul', 'motown', 'northernsoul'],
  },
  {
    id: 'funk',
    label: 'Funk & Boogie',
    group: 'Soul, Funk & Jazz',
    aliases: ['funk', 'boogie', 'pfunk', 'rarefunk', 'brokenbeat'],
  },
  {
    id: 'jazz',
    label: 'Jazz & Nu Jazz',
    group: 'Soul, Funk & Jazz',
    aliases: ['jazz', 'nujazz', 'jazzfunk', 'bigband', 'bebop', 'jamsession'],
  },

  // Global Grooves
  {
    id: 'afrobeats',
    label: 'Afrobeats',
    group: 'Global Grooves',
    aliases: ['afrobeats', 'afrobeat', 'afropop', 'afroswing', 'highlife'],
  },
  {
    id: 'latin',
    label: 'Latin & Reggaeton',
    group: 'Global Grooves',
    aliases: ['latin', 'reggaeton', 'perreo', 'salsa', 'cumbia', 'bachata'],
  },
  {
    id: 'bailefunk',
    label: 'Baile Funk & Global Club',
    group: 'Global Grooves',
    aliases: ['bailefunk', 'funkcarioca', 'batida', 'gqom', 'globalclub', 'kuduro'],
  },
  {
    id: 'balkan',
    label: 'Balkan & Folk',
    group: 'Global Grooves',
    aliases: ['balkan', 'gypsy', 'brass', 'klezmer', 'folk', 'anatolian'],
  },

  // Guitars
  {
    id: 'indie',
    label: 'Indie & Alternative',
    group: 'Guitars',
    aliases: ['indie', 'indierock', 'indiepop', 'alternative', 'britpop'],
  },
  {
    id: 'rock',
    label: 'Rock & Garage',
    group: 'Guitars',
    aliases: ['rock', 'garagerock', 'classicrock', 'psychrock', 'psychedelic', 'stonerrock'],
  },
  {
    id: 'shoegaze',
    label: 'Shoegaze & Dream Pop',
    group: 'Guitars',
    aliases: ['shoegaze', 'dreampop', 'noisepop', 'slowcore'],
  },
  {
    id: 'postpunk',
    label: 'Post-Punk & Goth',
    group: 'Guitars',
    aliases: ['postpunk', 'goth', 'gothic', 'deathrock', 'batcave'],
  },
  {
    id: 'punk',
    label: 'Punk & Hardcore',
    group: 'Guitars',
    aliases: ['punk', 'punkrock', 'hardcore', 'hardcorepunk', 'emo', 'streetpunk'],
  },
  {
    id: 'metal',
    label: 'Metal',
    group: 'Guitars',
    aliases: ['metal', 'blackmetal', 'deathmetal', 'doom', 'thrash', 'sludge'],
  },

  // Pop & Classics
  {
    id: 'pop',
    label: 'Pop & Charts',
    group: 'Pop & Classics',
    aliases: ['pop', 'charts', 'top40', 'mainstream', 'hits', 'radiopop'],
  },
  {
    id: 'nineties',
    label: '90s & 2000s',
    group: 'Pop & Classics',
    aliases: ['90s', '2000s', 'nineties', 'noughties', '90er', '2000er', 'throwback'],
  },
  {
    id: 'eighties',
    label: '80s Classics',
    group: 'Pop & Classics',
    aliases: ['80s', 'eighties', '80er', 'newromantic'],
  },
  {
    id: 'schlager',
    label: 'Schlager & German Pop',
    group: 'Pop & Classics',
    aliases: ['schlager', 'deutschpop', 'apresski', 'volksmusik'],
  },
  {
    id: 'kpop',
    label: 'K-Pop & J-Pop',
    group: 'Pop & Classics',
    aliases: ['kpop', 'jpop', 'citypop', 'asianpop'],
  },

  // Leftfield
  {
    id: 'ambient',
    label: 'Ambient & Drone',
    group: 'Leftfield',
    aliases: ['ambient', 'drone', 'newage', 'soundscape'],
  },
  {
    id: 'experimental',
    label: 'Experimental & Noise',
    group: 'Leftfield',
    aliases: ['experimental', 'noise', 'modular', 'avantgarde', 'musiqueconcrete'],
  },
  {
    id: 'idm',
    label: 'IDM & Breakcore',
    group: 'Leftfield',
    aliases: ['idm', 'braindance', 'glitch', 'breakcore'],
  },
];

export const VIBES: Vibe[] = [
  {
    id: 'dancing',
    label: 'Dance all night',
    hint: 'Full floor, no small talk',
    aliases: ['dancing', 'tanzen', 'dancefloor', 'club', 'clubbing', 'rave', 'party', 'feiern'],
  },
  {
    id: 'chill',
    label: 'Take it easy',
    hint: 'Talk, drink, sit down',
    aliases: ['chill', 'chillen', 'relaxed', 'cosy', 'cozy', 'lounge', 'bar', 'cocktail', 'apero'],
  },
  {
    id: 'live',
    label: 'Live on stage',
    hint: 'Bands, gigs, real instruments',
    aliases: ['live', 'livemusic', 'concert', 'konzert', 'gig', 'showcase', 'stage', 'band'],
  },
  {
    id: 'underground',
    label: 'Underground',
    hint: 'Raw, dark, no frills',
    aliases: ['underground', 'raw', 'dark', 'dunkel', 'basement', 'diy', 'warehouse'],
  },
  {
    id: 'dressy',
    label: 'Dressed up',
    hint: 'Make an effort, look sharp',
    aliases: ['dressy', 'schick', 'stylish', 'fancy', 'elegant', 'dresscode', 'glamour'],
  },
  {
    id: 'social',
    label: 'Meet people',
    hint: 'Friendly crowd, easy to talk',
    aliases: ['social', 'kennenlernen', 'community', 'meetup', 'friendly', 'mixer', 'newintown'],
  },
  {
    id: 'outdoors',
    label: 'Open air',
    hint: 'Garden, rooftop, riverside',
    aliases: ['openair', 'outdoor', 'draussen', 'garden', 'garten', 'terrace', 'rooftop', 'beach'],
  },
  {
    id: 'afterhours',
    label: 'Afterhours',
    hint: 'Keep going past sunrise',
    aliases: ['afterhour', 'afterhours', 'longnight', 'earlybird', 'sunrise', 'nonstop'],
  },
  {
    id: 'queer',
    label: 'Queer night',
    hint: 'Queer floors and safer spaces',
    aliases: ['queer', 'lgbtq', 'gay', 'lesbian', 'drag', 'ballroom', 'saferspace', 'pride'],
  },
  {
    id: 'arts',
    label: 'Something different',
    hint: 'Comedy, quiz, performance, art',
    aliases: ['comedy', 'standup', 'quiz', 'karaoke', 'performance', 'poetry', 'reading', 'kunst'],
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

const GENRE_LOOKUP = buildLookup(GENRES);
const VIBE_LOOKUP = buildLookup(VIBES);

const MIN_SUBSTRING_ALIAS = 4;

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

    // Fall back to substring matching, e.g. "melodic-techno-live" -> techno.
    const hits: string[] = [];
    for (const alias of lookup.keys()) {
      if (alias.length >= MIN_SUBSTRING_ALIAS && normalized.includes(alias)) hits.push(alias);
    }
    // Keep only the most specific hits: "afrohouse" wins over "house".
    for (const alias of hits) {
      const isCoveredByLongerHit = hits.some(
        (other) => other.length > alias.length && other.includes(alias),
      );
      if (isCoveredByLongerHit) continue;
      const id = lookup.get(alias);
      if (id) resolved.add(id);
    }
  }

  return [...resolved];
}

/** Maps raw `category` values onto canonical genre ids. */
export function resolveGenres(tags: string[] | null | undefined): string[] {
  return resolve(GENRE_LOOKUP, tags);
}

/** Maps raw `vibe_tags` values onto canonical vibe ids. */
export function resolveVibes(tags: string[] | null | undefined): string[] {
  return resolve(VIBE_LOOKUP, tags);
}

/**
 * Free-text phrases used to read a genre out of an event title when the import
 * brought no `category` values. Aliases are matched as well, these are the
 * multi-word and German spellings on top.
 */
const GENRE_PHRASES: Record<string, string[]> = {
  house: ['house', 'deep house', 'soulful house', 'house music'],
  techhouse: ['tech house'],
  minimal: ['minimal', 'micro house'],
  disco: ['disco', 'italo', 'nu disco', 'roller disco', 'discothek'],
  afrohouse: ['afro house', 'amapiano', 'afro tech'],
  techno: ['techno', 'klubnacht', 'clubnacht techno'],
  hardtechno: ['hard techno', 'schranz', 'hardgroove', 'industrial'],
  melodictechno: ['melodic techno', 'melodic house', 'progressive house'],
  electro: ['electro', 'electronic', 'electronica', 'elektro', 'elektronische'],
  wave: ['wave', 'new wave', 'darkwave', 'cold wave', 'synth pop', 'synthpop', 'ebm'],
  trance: ['trance', 'psytrance', 'psy trance', 'goa'],
  hardstyle: ['hardstyle', 'gabber', 'frenchcore', 'uptempo', 'hardcore techno'],
  dnb: ['drum and bass', 'drum n bass', 'dnb', 'd n b', 'liquid funk', 'neurofunk', 'jump up'],
  jungle: ['jungle', 'breakbeat', 'breaks', 'big beat'],
  dubstep: ['dubstep', 'riddim', 'bass music', 'halftime'],
  ukgarage: ['uk garage', '2 step', 'speed garage', 'bassline'],
  footwork: ['footwork', 'juke', 'jersey club', 'ghettotech'],
  hiphop: ['hip hop', 'hiphop', 'rap', 'deutschrap', 'boom bap', 'freestyle', 'cypher', 'swag jam'],
  trap: ['trap', 'drill', 'phonk'],
  grime: ['grime', 'uk drill'],
  rnb: ['r n b', 'rnb', 'neo soul', 'rhythm and blues'],
  dancehall: ['dancehall', 'reggae', 'ragga', 'bashment', 'dub', 'ska', 'roots'],
  soul: ['soul', 'motown', 'northern soul'],
  funk: ['funk', 'boogie', 'p funk'],
  jazz: [
    'jazz',
    'jam session',
    'jamsession',
    'big band',
    'bigband',
    'bebop',
    'swing',
    'quintett',
    'quartett',
    'septett',
    'trio',
    'all stars',
  ],
  afrobeats: ['afrobeats', 'afrobeat', 'afropop', 'highlife', 'afroswing'],
  latin: [
    'latin',
    'latino',
    'salsa',
    'reggaeton',
    'perreo',
    'bachata',
    'cumbia',
    'merengue',
    'tango',
    'havanna',
  ],
  bailefunk: ['baile funk', 'funk carioca', 'gqom', 'kuduro', 'batida'],
  balkan: ['balkan', 'brass', 'blasmusik', 'blasorchester', 'klezmer', 'folk', 'oriental'],
  indie: ['indie', 'indie rock', 'indie pop', 'indie disco', 'alternative', 'britpop'],
  rock: ['rock', 'garage rock', 'classic rock', 'psychedelic', 'stoner', 'rockabilly'],
  shoegaze: ['shoegaze', 'dream pop', 'noise pop', 'post rock', 'slowcore'],
  postpunk: ['post punk', 'goth', 'gothic', 'death rock', 'batcave'],
  punk: ['punk', 'punk rock', 'hardcore punk', 'ska punk', 'emo', 'crust'],
  metal: ['metal', 'death metal', 'black metal', 'doom', 'thrash', 'sludge', 'grindcore'],
  pop: ['pop', 'charts', 'top 40', 'hits', 'mainstream'],
  nineties: ['90s', '90er', '2000s', '2000er', 'nineties', 'y2k', 'throwback'],
  eighties: ['80s', '80er', 'eighties', 'new romantic'],
  schlager: ['schlager', 'apres ski', 'volksmusik', 'deutschpop'],
  kpop: ['k pop', 'kpop', 'j pop', 'jpop', 'city pop', 'anime'],
  ambient: ['ambient', 'drone', 'new age', 'soundscape'],
  experimental: ['experimental', 'noise', 'modular', 'avant garde', 'improvisation'],
  idm: ['idm', 'breakcore', 'glitch', 'braindance'],
};

/** Same idea for vibes: what the title says about the mood of the night. */
const VIBE_PHRASES: Record<string, string[]> = {
  dancing: [
    'party',
    'rave',
    'dance',
    'dancing',
    'tanzen',
    'tanz',
    'clubnacht',
    'klubnacht',
    'dance floor',
    'dancefloor',
    'roller disco',
    'sause',
    'fiesta',
    'night fever',
  ],
  chill: ['bar', 'lounge', 'cocktail', 'chill', 'apero', 'aperitivo', 'kneipe', 'wohnzimmer'],
  live: [
    'live',
    'concert',
    'konzert',
    'tour',
    'gig',
    'support',
    'showcase',
    'open stage',
    'unplugged',
    'session',
    'presents',
    'album',
  ],
  underground: ['underground', 'warehouse', 'basement', 'keller', 'raw', 'diy'],
  dressy: ['gala', 'dresscode', 'elegant', 'glamour', 'burlesque', 'variete', 'revue', 'soiree'],
  social: [
    'meetup',
    'take me out',
    'speed dating',
    'singles',
    'kennenlernen',
    'new in town',
    'language exchange',
    'stammtisch',
  ],
  outdoors: [
    'open air',
    'openair',
    'garten',
    'garden',
    'rooftop',
    'terrasse',
    'biergarten',
    'strand',
    'beach',
  ],
  afterhours: ['afterhour', 'afterhours', 'after hour', 'sunrise', 'early bird', 'nonstop'],
  queer: ['queer', 'gay', 'lesbian', 'drag', 'ballroom', 'pride', 'csd', 'lgbt', 'lgbtq', 'dyke'],
  arts: [
    'quiz',
    'pubquiz',
    'pub quiz',
    'karaoke',
    'comedy',
    'stand up',
    'standup',
    'lesung',
    'poetry',
    'slam',
    'performance',
    'kino',
    'film',
    'circus',
    'wrestling',
    'bingo',
    'theater',
    'ausstellung',
    'flohmarkt',
    'workshop',
    'kunst',
  ],
};

/** Lowercases, strips umlauts and pads the text so phrases match whole words. */
export function normalizeText(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => UMLAUTS[char] ?? char)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return cleaned ? ` ${cleaned} ` : '';
}

function buildPhraseLookup(
  items: { id: string; aliases: string[] }[],
  phrases: Record<string, string[]>,
) {
  const lookup = new Map<string, string>();
  const add = (phrase: string, id: string) => {
    const normalized = normalizeText(phrase).trim();
    if (normalized.length >= 3) lookup.set(normalized, id);
  };
  for (const item of items) {
    add(item.id, item.id);
    for (const alias of item.aliases) add(alias, item.id);
    for (const phrase of phrases[item.id] ?? []) add(phrase, item.id);
  }
  return lookup;
}

const GENRE_PHRASE_LOOKUP = buildPhraseLookup(GENRES, GENRE_PHRASES);
const VIBE_PHRASE_LOOKUP = buildPhraseLookup(VIBES, VIBE_PHRASES);

function matchPhrases(lookup: Map<string, string>, text: string): string[] {
  const padded = normalizeText(text);
  if (!padded) return [];

  const matched: { phrase: string; id: string }[] = [];
  for (const [phrase, id] of lookup) {
    if (padded.includes(` ${phrase} `)) matched.push({ phrase, id });
  }

  // Keep the most specific hit only: "baile funk" wins over "funk".
  const ids = new Set<string>();
  for (const entry of matched) {
    const covered = matched.some(
      (other) => other.phrase.length > entry.phrase.length && other.phrase.includes(entry.phrase),
    );
    if (!covered) ids.add(entry.id);
  }
  return [...ids];
}

/** Reads genres out of free text (event title, venue, line-up). */
export function inferGenresFromText(text: string): string[] {
  return matchPhrases(GENRE_PHRASE_LOOKUP, text);
}

/** Reads vibes out of free text (event title, venue, line-up). */
export function inferVibesFromText(text: string): string[] {
  return matchPhrases(VIBE_PHRASE_LOOKUP, text);
}

export const GENRE_LABELS: Record<string, string> = Object.fromEntries(
  GENRES.map((genre) => [genre.id, genre.label]),
);

export const VIBE_LABELS: Record<string, string> = Object.fromEntries(
  VIBES.map((vibe) => [vibe.id, vibe.label]),
);
