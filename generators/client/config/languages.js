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
  bg: {
    name: 'Български',
    engName: 'Bulgarian',
    value: 'bg',
  },
  zh: {
    name: '中文 (简体)',
    engName: 'Chinese (Simplified)',
    value: 'zh',
  },
  hr: {
    name: 'Hrvatski',
    engName: 'Croatian',
    value: 'hr',
  },
  cs: {
    name: 'Čeština',
    engName: 'Czech',
    value: 'cs',
  },
  da: {
    name: 'Dansk',
    engName: 'Danish',
    value: 'da',
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
  fi: {
    name: 'Suomi',
    engName: 'Finnish',
    value: 'fi',
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
  hu: {
    name: 'Magyar',
    engName: 'Hungarian',
    value: 'hu',
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
  no: {
    name: 'Norsk',
    engName: 'Norwegian',
    value: 'no',
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
  sr: {
    name: 'Српски',
    engName: 'Serbian',
    value: 'sr',
  },
  sk: {
    name: 'Slovenčina',
    engName: 'Slovak',
    value: 'sk',
  },
  es: {
    name: 'Español',
    engName: 'Spanish',
    value: 'es',
  },
  sv: {
    name: 'Svenska',
    engName: 'Swedish',
    value: 'sv',
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