import { useLanguageStore } from '../store/languageStore';
import { translations, TranslationKey, Lang } from './translations';

export function useTranslation() {
  const { lang, setLang } = useLanguageStore();
  const dict = translations[lang];

  function t<K extends TranslationKey>(key: K): typeof dict[K] {
    return dict[key];
  }

  return { t, lang, setLang };
}

// Non-hook accessor for use in utility functions (format.ts)
export function getT() {
  const lang: Lang = useLanguageStore.getState().lang;
  const dict = translations[lang];
  return <K extends TranslationKey>(key: K): typeof dict[K] => dict[key];
}
