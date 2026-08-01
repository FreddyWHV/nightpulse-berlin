import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

export interface FavoriteOrganizer {
  /** Normalised name, used as the map key. */
  key: string;
  name: string;
  district: string | null;
  /** Photo from the database, if the source already has one. */
  imageUrl: string | null;
  savedAt: number;
}

/** Same organiser written slightly differently should still be one favourite. */
export function organizerKey(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

interface FavoritesState {
  items: Record<string, FavoriteOrganizer>;
  /** False until the saved list has been read back from the device. */
  hydrated: boolean;
  toggle: (input: { name: string; district?: string | null; imageUrl?: string | null }) => void;
  remove: (key: string) => void;
  clear: () => void;
}

/**
 * Organisers the user marked with a heart. Stored on the device, so the list
 * survives a reload — and the feed pushes their events to the top.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      items: {},
      hydrated: false,
      toggle: ({ name, district = null, imageUrl = null }) =>
        set((state) => {
          const key = organizerKey(name);
          if (!key) return state;

          if (state.items[key]) {
            const next = { ...state.items };
            delete next[key];
            return { items: next };
          }

          return {
            items: {
              ...state.items,
              [key]: { key, name, district, imageUrl, savedAt: Date.now() },
            },
          };
        }),
      remove: (key) =>
        set((state) => {
          if (!state.items[key]) return state;
          const next = { ...state.items };
          delete next[key];
          return { items: next };
        }),
      clear: () => set({ items: {} }),
    }),
    {
      name: 'nightpulse-favorites-v1',
      version: 1,
      storage: createJSONStorage(() => deviceStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => () => {
        useFavoritesStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Sorted newest first — used by the profile list. */
export function sortFavorites(items: Record<string, FavoriteOrganizer>): FavoriteOrganizer[] {
  return Object.values(items).sort((left, right) => right.savedAt - left.savedAt);
}
