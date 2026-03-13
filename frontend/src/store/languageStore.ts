import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang } from '../i18n/translations';

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => Promise<void>;
  loadLang: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  lang: 'fr', // Quebec-first default

  setLang: async (lang: Lang) => {
    await AsyncStorage.setItem('app_lang', lang);
    set({ lang });
  },

  loadLang: async () => {
    try {
      const stored = await AsyncStorage.getItem('app_lang');
      if (stored === 'en' || stored === 'fr') {
        set({ lang: stored });
      }
    } catch {
      // keep default
    }
  },
}));
