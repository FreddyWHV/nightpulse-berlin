import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Key/value storage that keeps working everywhere the app runs.
 *
 * On web the browser's own `localStorage` is used directly (fastest path, and it
 * survives a reload even when a bundled shim misbehaves). Native uses
 * AsyncStorage. If both are unavailable — e.g. a sandboxed iframe that blocks
 * storage — values stay in memory for the session instead of throwing, so the
 * UI never breaks because of a failed write.
 */
const memory = new Map<string, string>();

function browserStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const probe = '__nightpulse_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export const deviceStorage: StateStorage = {
  async getItem(name) {
    const browser = browserStorage();
    if (browser) return browser.getItem(name);
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  async setItem(name, value) {
    memory.set(name, value);
    const browser = browserStorage();
    if (browser) {
      browser.setItem(name, value);
      return;
    }
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Kept in memory above.
    }
  },
  async removeItem(name) {
    memory.delete(name);
    const browser = browserStorage();
    if (browser) {
      browser.removeItem(name);
      return;
    }
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Nothing else to clean up.
    }
  },
};
