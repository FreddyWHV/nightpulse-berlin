import { create } from 'zustand';

import { dayKey, nightDateOf } from './dates';

/**
 * Feed and map share one filter state so the two buttons in the top bar keep
 * their value (and their position) when the user switches tabs.
 */
export interface FilterState {
  /** Night key (yyyy-MM-dd of the evening the night starts on). */
  day: string;
  /** Selected vibe ids. Empty = "Egal". */
  vibes: string[];
  setDay: (key: string) => void;
  toggleVibe: (id: string) => void;
  setVibes: (ids: string[]) => void;
  clearVibes: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  day: dayKey(nightDateOf()),
  vibes: [],
  setDay: (key) => set({ day: key }),
  toggleVibe: (id) =>
    set((state) => ({
      vibes: state.vibes.includes(id)
        ? state.vibes.filter((entry) => entry !== id)
        : [...state.vibes, id],
    })),
  setVibes: (ids) => set({ vibes: ids }),
  clearVibes: () => set({ vibes: [] }),
}));
