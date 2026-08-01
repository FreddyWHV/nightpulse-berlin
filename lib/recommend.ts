import { INTEREST_LABELS, VIBE_LABELS, resolveInterests, resolveVibes } from './taxonomy';
import type { EventRow, ScoredEvent } from './types';

export interface RankOptions {
  interests: string[];
  /** Vibes stored in the profile. */
  profileVibes: string[];
  /** Vibes selected in the feed filter for tonight. */
  selectedVibes: string[];
  districts: string[];
  maxPrice: number | null;
  freeOnly: boolean;
}

const INTEREST_WEIGHT = 4;
const SELECTED_VIBE_WEIGHT = 5;
const PROFILE_VIBE_WEIGHT = 2;
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
  const eventInterests = resolveInterests(event.category);
  const eventVibes = resolveVibes(event.vibe_tags);

  const interestHits = intersect(eventInterests, options.interests);
  const selectedVibeHits = intersect(eventVibes, options.selectedVibes);
  const profileVibeHits = intersect(eventVibes, options.profileVibes).filter(
    (vibe) => !options.selectedVibes.includes(vibe),
  );

  let score = interestHits.length * INTEREST_WEIGHT;
  score += selectedVibeHits.length * SELECTED_VIBE_WEIGHT;
  score += profileVibeHits.length * PROFILE_VIBE_WEIGHT;

  const districtHit = Boolean(event.district && options.districts.includes(event.district));
  if (districtHit) score += DISTRICT_WEIGHT;
  if (event.is_free) score += 1;

  const reasons: string[] = [];
  if (interestHits.length) {
    reasons.push(interestHits.map((id) => INTEREST_LABELS[id] ?? id).join(' · '));
  }
  const vibeReasons = [...selectedVibeHits, ...profileVibeHits];
  if (vibeReasons.length) {
    reasons.push(vibeReasons.map((id) => VIBE_LABELS[id] ?? id).join(' · '));
  }
  if (districtHit && event.district) reasons.push(event.district);

  return {
    event,
    score,
    interestHits,
    vibeHits: [...selectedVibeHits, ...profileVibeHits],
    reasons,
  };
}

/**
 * True when an event is a real recommendation rather than just "also happening".
 * Requires an interest match, and a vibe match whenever vibes are selected.
 */
export function isRecommended(scored: ScoredEvent, options: RankOptions): boolean {
  const hasTaste = options.interests.length > 0 || options.profileVibes.length > 0;
  if (!hasTaste) return false;

  if (options.selectedVibes.length > 0 && scored.vibeHits.length === 0) return false;
  if (options.interests.length > 0 && scored.interestHits.length === 0) {
    // Allow strong vibe-only matches through when the vibe was picked explicitly.
    return scored.vibeHits.length > 0 && options.selectedVibes.length > 0;
  }
  return scored.score > 0;
}

export interface RankedFeed {
  recommended: ScoredEvent[];
  others: ScoredEvent[];
  hasTaste: boolean;
}

function byTime(left: ScoredEvent, right: ScoredEvent): number {
  return new Date(left.event.starts_at).getTime() - new Date(right.event.starts_at).getTime();
}

export function rankEvents(events: EventRow[], options: RankOptions): RankedFeed {
  const hasTaste = options.interests.length > 0 || options.profileVibes.length > 0;
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
