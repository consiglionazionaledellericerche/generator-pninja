export const LANGUAGES_DATA = {
  ar: {
    name: 'العربية',
    engName: 'Arabic',
    value: 'ar',
  },
  bn: {
    name: 'বাংলা',
    engName: 'Bengali',
    value: 'bn',
  },
  "zh-CN": {
    name: '中文 (简体)',
    engName: 'Chinese (Simplified)',
    value: 'zh-CN',
  },
  "zh-TW": {
    name: '中文 (繁體)',
    engName: 'Chinese (Traditional)',
    value: 'zh-TW',
  },
  nl: {
    name: 'Nederlands',
    engName: 'Dutch',
    value: 'nl',
  },
  en: {
    name: 'English',
    engName: 'English',
    value: 'en',
  },
  fr: {
    name: 'Français',
    engName: 'French',
    value: 'fr',
  },
  de: {
    name: 'Deutsch',
    engName: 'German',
    value: 'de',
  },
  el: {
    name: 'Ελληνικά',
    engName: 'Greek',
    value: 'el',
  },
  ha: {
    name: 'Hausa',
    engName: 'Hausa',
    value: 'ha',
  },
  he: {
    name: 'עברית',
    engName: 'Hebrew',
    value: 'he',
  },
  hi: {
    name: 'हिंदी',
    engName: 'Hindi',
    value: 'hi',
  },
  id: {
    name: 'Bahasa Indonesia',
    engName: 'Indonesian',
    value: 'id',
  },
  it: {
    name: 'Italiano',
    engName: 'Italian',
    value: 'it',
  },
  ja: {
    name: '日本語',
    engName: 'Japanese',
    value: 'ja',
  },
  ko: {
    name: '한국어',
    engName: 'Korean',
    value: 'ko',
  },
  fa: {
    name: 'فارسی',
    engName: 'Persian',
    value: 'fa',
  },
  pl: {
    name: 'Polski',
    engName: 'Polish',
    value: 'pl',
  },
  pt: {
    name: 'Português',
    engName: 'Portuguese',
    value: 'pt',
  },
  ro: {
    name: 'Română',
    engName: 'Romanian',
    value: 'ro',
  },
  ru: {
    name: 'Русский',
    engName: 'Russian',
    value: 'ru',
  },
  es: {
    name: 'Español',
    engName: 'Spanish',
    value: 'es',
  },
  sw: {
    name: 'Kiswahili',
    engName: 'Swahili',
    value: 'sw',
  },
  tr: {
    name: 'Türkçe',
    engName: 'Turkish',
    value: 'tr',
  },
  ur: {
    name: 'اردو',
    engName: 'Urdu',
    value: 'ur',
  },
  uk: {
    name: 'Українська',
    engName: 'Ukrainian',
    value: 'uk',
  }
};

export const LANGUAGES = Object.values(LANGUAGES_DATA).map(({ engName, name, value }) => ({ name: `${engName} (${name})`, value }));

export const DEFAULT_LANGUAGE = 'en';

export const getAvailableLanguages = (excludeLanguage = null) => {
  return LANGUAGES.filter((lang) => lang.value !== excludeLanguage);
};

export const getLanguageData = (value) => {
  return LANGUAGES_DATA[value];
};