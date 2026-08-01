import { create } from 'zustand';

import { DEFAULT_CITY_ID } from './cities';
import { dayKey, nightDateOf } from './dates';

/**
 * Feed and map share one filter state so the two buttons in the top bar keep
 * their value (and their position) when the user switches tabs.
 */
export interface FilterState {
  /** Selected city id (see lib/cities.ts). */
  cityId: string;
  /** Night key (yyyy-MM-dd of the evening the night starts on). */
  day: string;
  /** Selected vibe ids. Empty = "anything". */
  vibes: string[];
  /** True once the launch mood screen has been answered in this session. */
  moodAsked: boolean;
  setCity: (id: string) => void;
  setDay: (key: string) => void;
  toggleVibe: (id: string) => void;
  setVibes: (ids: string[]) => void;
  clearVibes: () => void;
  /** Answer from the launch screen: apply the picked vibes and move on. */
  completeMood: (ids: string[]) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  cityId: DEFAULT_CITY_ID,
  day: dayKey(nightDateOf()),
  vibes: [],
  moodAsked: false,
  setCity: (id) => set({ cityId: id }),
  setDay: (key) => set({ day: key }),
  toggleVibe: (id) =>
    set((state) => ({
      vibes: state.vibes.includes(id)
        ? state.vibes.filter((entry) => entry !== id)
        : [...state.vibes, id],
    })),
  setVibes: (ids) => set({ vibes: ids }),
  clearVibes: () => set({ vibes: [] }),
  completeMood: (ids) => set({ vibes: ids, moodAsked: true }),
}));
