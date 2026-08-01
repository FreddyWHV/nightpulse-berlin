import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The profile only stores lasting taste: music genres, districts, budget.
 * Vibes are a per-night decision and live in `filterStore` instead.
 */
export interface ProfileState {
  displayName: string;
  /** Canonical music genre ids from `lib/taxonomy`. */
  genres: string[];
  districts: string[];
  /** null = no budget limit. */
  maxPrice: number | null;
  freeOnly: boolean;
  setDisplayName: (value: string) => void;
  toggleGenre: (id: string) => void;
  toggleDistrict: (id: string) => void;
  setMaxPrice: (value: number | null) => void;
  setFreeOnly: (value: boolean) => void;
  reset: () => void;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

const INITIAL = {
  displayName: '',
  genres: [] as string[],
  districts: [] as string[],
  maxPrice: null as number | null,
  freeOnly: false,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setDisplayName: (value) => set({ displayName: value }),
      toggleGenre: (id) => set((state) => ({ genres: toggle(state.genres, id) })),
      toggleDistrict: (id) => set((state) => ({ districts: toggle(state.districts, id) })),
      setMaxPrice: (value) => set({ maxPrice: value }),
      setFreeOnly: (value) => set({ freeOnly: value }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      // v2: vibes moved out of the profile, interests renamed to genres.
      name: 'nightpulse-profile-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        displayName: state.displayName,
        genres: state.genres,
        districts: state.districts,
        maxPrice: state.maxPrice,
        freeOnly: state.freeOnly,
      }),
    },
  ),
);
