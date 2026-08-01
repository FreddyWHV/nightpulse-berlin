/**
 * Shape of a row in the `public.events_feed` view (events joined with sources,
 * geography flattened into latitude/longitude).
 */
export interface EventRow {
  id: string;
  title: string;
  description_ours: string | null;
  starts_at: string;
  ends_at: string | null;
  doors_at: string | null;
  venue_name: string | null;
  address: string | null;
  district: string | null;
  venue_homepage: string | null;
  price_min: number | null;
  price_max: number | null;
  is_free: boolean | null;
  ticket_url: string | null;
  source_url: string | null;
  category: string[] | null;
  vibe_tags: string[] | null;
  lineup: string[] | null;
  image_url: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ScoredEvent {
  event: EventRow;
  score: number;
  /** Interest ids that matched this event. */
  interestHits: string[];
  /** Vibe ids that matched this event. */
  vibeHits: string[];
  reasons: string[];
}
