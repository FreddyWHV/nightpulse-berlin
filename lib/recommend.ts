import { GENRE_LABELS, VIBE_LABELS, resolveGenres, resolveVibes } from './taxonomy';
import type { EventRow, ScoredEvent } from './types';

export interface RankOptions {
  /** Music genres from the profile — the only place taste is stored. */
  genres: string[];
  /** Vibes picked in the feed/map top bar for this night. */
  vibes: string[];
  districts: string[];
  maxPrice: number | null;
  freeOnly: boolean;
}

const GENRE_WEIGHT = 4;
const VIBE_WEIGHT = 5;
const DISTRICT_WEIGHT = 2;

function intersect(left: string[], right: string[]): string[] {
  if (!left.length || !right.length) return [];
  const set = new Set(right);
  return left.filter((entry) => set.has(entry));
}

function priceOf(event: EventRow): number {
  if (event.is_free) return 0;
  return event.price_min ?? event.price_max ?? 0;
}

/** Hard filters the user set explicitly in their profile. */
export function passesProfileFilters(event: EventRow, options: RankOptions): boolean {
  if (options.freeOnly && !event.is_free && priceOf(event) > 0) return false;
  if (options.maxPrice != null && priceOf(event) > options.maxPrice) return false;
  return true;
}

export function scoreEvent(event: EventRow, options: RankOptions): ScoredEvent {
  const eventGenres = resolveGenres(event.category);
  const eventVibes = resolveVibes(event.vibe_tags);

  const genreHits = intersect(eventGenres, options.genres);
  const vibeHits = intersect(eventVibes, options.vibes);

  let score = genreHits.length * GENRE_WEIGHT + vibeHits.length * VIBE_WEIGHT;

  const districtHit = Boolean(event.district && options.districts.includes(event.district));
  if (districtHit) score += DISTRICT_WEIGHT;
  if (event.is_free) score += 1;

  const reasons: string[] = [];
  if (genreHits.length) {
    reasons.push(genreHits.map((id) => GENRE_LABELS[id] ?? id).join(' · '));
  }
  if (vibeHits.length) {
    reasons.push(vibeHits.map((id) => VIBE_LABELS[id] ?? id).join(' · '));
  }
  if (districtHit && event.district) reasons.push(event.district);

  return { event, score, genreHits, vibeHits, reasons };
}

/**
 * True when an event is a real recommendation rather than just "also happening".
 * Genres and vibes are independent gates: whichever the user set has to match.
 */
export function isRecommended(scored: ScoredEvent, options: RankOptions): boolean {
  const hasGenres = options.genres.length > 0;
  const hasVibes = options.vibes.length > 0;
  if (!hasGenres && !hasVibes) return false;
  if (hasGenres && scored.genreHits.length === 0) return false;
  if (hasVibes && scored.vibeHits.length === 0) return false;
  return true;
}

export interface RankedFeed {
  recommended: ScoredEvent[];
  others: ScoredEvent[];
  /** True when the user gave us something to match against. */
  hasTaste: boolean;
}

function byTime(left: ScoredEvent, right: ScoredEvent): number {
  return new Date(left.event.starts_at).getTime() - new Date(right.event.starts_at).getTime();
}

export function rankEvents(events: EventRow[], options: RankOptions): RankedFeed {
  const hasTaste = options.genres.length > 0 || options.vibes.length > 0;
  const scored = events
    .filter((event) => passesProfileFilters(event, options))
    .map((event) => scoreEvent(event, options));

  const recommended = scored
    .filter((entry) => isRecommended(entry, options))
    .sort((left, right) => right.score - left.score || byTime(left, right));

  const recommendedIds = new Set(recommended.map((entry) => entry.event.id));
  const others = scored.filter((entry) => !recommendedIds.has(entry.event.id)).sort(byTime);

  return { recommended, others, hasTaste };
}
