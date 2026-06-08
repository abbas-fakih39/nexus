import { create } from 'zustand';
import type { Settings } from '../api/settings';

interface SettingsState {
  settings: Settings | null;
  setSettings: (s: Settings) => void;
}

/** Settings du magasin (nom + logo) partagés : sidebar, page Paramètres. */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
}));
