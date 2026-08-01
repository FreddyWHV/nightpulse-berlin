import { useQuery } from '@tanstack/react-query';

import { buildMockEvents } from '@/lib/mockEvents';
import { supabase } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';

const WINDOW_DAYS = 21;
const LOOKBEHIND_HOURS = 12;

export interface EventFeedResult {
  events: EventRow[];
  /** True when the Supabase tables are still empty and demo data is shown. */
  isMock: boolean;
  notice: string | null;
}

async function loadEvents(): Promise<EventFeedResult> {
  const now = new Date();
  const from = new Date(now.getTime() - LOOKBEHIND_HOURS * 60 * 60 * 1000);
  const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const mock: EventFeedResult = {
    events: buildMockEvents(now, WINDOW_DAYS),
    isMock: true,
    notice: 'Demo-Programm — noch keine Events in der Datenbank.',
  };

  if (!supabase) {
    return { ...mock, notice: 'Demo-Programm — keine Supabase-Verbindung konfiguriert.' };
  }

  const { data, error } = await supabase
    .from('events_feed')
    .select('*')
    .gte('starts_at', from.toISOString())
    .lte('starts_at', to.toISOString())
    .order('starts_at', { ascending: true })
    .limit(2000)
    .returns<EventRow[]>();

  if (error) {
    return { ...mock, notice: `Demo-Programm — Datenbank nicht erreichbar (${error.message}).` };
  }

  const rows = data ?? [];
  if (rows.length === 0) return mock;

  return { events: rows, isMock: false, notice: null };
}

export function useEventFeed() {
  return useQuery({
    queryKey: ['events-feed', WINDOW_DAYS],
    queryFn: loadEvents,
    staleTime: 5 * 60 * 1000,
  });
}
