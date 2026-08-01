import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ProfileState {
  displayName: string;
  interests: string[];
  vibes: string[];
  districts: string[];
  /** null = no budget limit. */
  maxPrice: number | null;
  freeOnly: boolean;
  setDisplayName: (value: string) => void;
  toggleInterest: (id: string) => void;
  toggleVibe: (id: string) => void;
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
  interests: [] as string[],
  vibes: [] as string[],
  districts: [] as string[],
  maxPrice: null as number | null,
  freeOnly: false,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setDisplayName: (value) => set({ displayName: value }),
      toggleInterest: (id) => set((state) => ({ interests: toggle(state.interests, id) })),
      toggleVibe: (id) => set((state) => ({ vibes: toggle(state.vibes, id) })),
      toggleDistrict: (id) => set((state) => ({ districts: toggle(state.districts, id) })),
      setMaxPrice: (value) => set({ maxPrice: value }),
      setFreeOnly: (value) => set({ freeOnly: value }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: 'nachtplan-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        displayName: state.displayName,
        interests: state.interests,
        vibes: state.vibes,
        districts: state.districts,
        maxPrice: state.maxPrice,
        freeOnly: state.freeOnly,
      }),
    },
  ),
);
