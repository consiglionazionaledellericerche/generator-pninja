// languages.js - Versione avanzata
export const LANGUAGES_DATA = {
  en: {
    name: 'English (English)',
    value: 'en',
    rtl: false,
  },
  fr: {
    name: 'French (Français)',
    value: 'fr',
    rtl: false,
  },
  it: {
    name: 'Italian (Italiano)',
    value: 'it',
    rtl: false,
  },
  es: {
    name: 'Spanish (Español)',
    value: 'es',
    rtl: false,
  },
  de: {
    name: 'German (Deutsch)',
    value: 'de',
    rtl: false,
  }
};

export const LANGUAGES = Object.values(LANGUAGES_DATA).map(({ name, value }) => ({ name, value }));

export const DEFAULT_LANGUAGE = 'en';

export const getAvailableLanguages = (excludeLanguage = null) => {
  return LANGUAGES.filter((lang) => lang.value !== excludeLanguage);
};
