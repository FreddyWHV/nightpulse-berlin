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
  /** Where `image_url` came from (credit line). */
  image_source: string | null;
  /** Name of the venue/promoter behind the event (`sources.name`). */
  organizer_name: string | null;
  /** Organiser photo or logo (`sources.image_url`). */
  organizer_image_url: string | null;
  /** `sources.type`, e.g. `venue`, `promoter`. */
  organizer_type: string | null;
}

export interface ScoredEvent {
  event: EventRow;
  score: number;
  /** Music genre ids from the profile that matched this event. */
  genreHits: string[];
  /** Vibe ids from the top-bar filter that matched this event. */
  vibeHits: string[];
  reasons: string[];
}
