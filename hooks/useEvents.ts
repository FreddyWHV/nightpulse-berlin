import { useQuery } from '@tanstack/react-query';

import { buildMockEvents } from '@/lib/mockEvents';
import { normalizeEvent } from '@/lib/normalize';
import { supabase } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';

const WINDOW_DAYS = 60;
const LOOKBEHIND_HOURS = 12;

export interface EventFeedResult {
  events: EventRow[];
  /** True while the Supabase tables are empty and the demo programme is shown. */
  isMock: boolean;
}

async function loadEvents(): Promise<EventFeedResult> {
  const now = new Date();
  const from = new Date(now.getTime() - LOOKBEHIND_HOURS * 60 * 60 * 1000);
  const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const mock: EventFeedResult = {
    events: buildMockEvents(now, WINDOW_DAYS).map(normalizeEvent),
    isMock: true,
  };

  if (!supabase) return mock;

  const { data, error } = await supabase
    .from('events_feed')
    .select('*')
    .gte('starts_at', from.toISOString())
    .lte('starts_at', to.toISOString())
    .order('starts_at', { ascending: true })
    .limit(3000)
    .returns<EventRow[]>();

  if (error) return mock;

  const rows = data ?? [];
  if (rows.length === 0) return mock;

  return { events: rows.map(normalizeEvent), isMock: false };
}

export function useEventFeed() {
  return useQuery({
    queryKey: ['events-feed', WINDOW_DAYS],
    queryFn: loadEvents,
    staleTime: 5 * 60 * 1000,
  });
}
