export const LANGUAGES_DATA = {
  am: { name: 'አማርኛ', engName: 'Amharic', value: 'am' },
  sq: { name: 'Shqip', engName: 'Albanian', value: 'sq' },
  ar: { name: 'العربية', engName: 'Arabic', value: 'ar' },
  hy: { name: 'Հայերեն', engName: 'Armenian', value: 'hy' },
  az: { name: 'Azərbaycan dili', engName: 'Azerbaijani', value: 'az' },
  eu: { name: 'Euskara', engName: 'Basque', value: 'eu' },
  bn: { name: 'বাংলা', engName: 'Bengali', value: 'bn' },
  bg: { name: 'Български', engName: 'Bulgarian', value: 'bg' },
  ca: { name: 'Català', engName: 'Catalan', value: 'ca' },
  zh: { name: '中文 (简体)', engName: 'Chinese (Simplified)', value: 'zh' },
  hr: { name: 'Hrvatski', engName: 'Croatian', value: 'hr' },
  cs: { name: 'Čeština', engName: 'Czech', value: 'cs' },
  cy: { name: 'Cymraeg', engName: 'Welsh', value: 'cy' },
  da: { name: 'Dansk', engName: 'Danish', value: 'da' },
  nl: { name: 'Nederlands', engName: 'Dutch', value: 'nl' },
  en: { name: 'English', engName: 'English', value: 'en' },
  et: { name: 'Eesti', engName: 'Estonian', value: 'et' },
  fi: { name: 'Suomi', engName: 'Finnish', value: 'fi' },
  fr: { name: 'Français', engName: 'French', value: 'fr' },
  fy: { name: 'Frysk', engName: 'Western Frisian', value: 'fy' },
  gl: { name: 'Galego', engName: 'Galician', value: 'gl' },
  de: { name: 'Deutsch', engName: 'German', value: 'de' },
  el: { name: 'Ελληνικά', engName: 'Greek', value: 'el' },
  gu: { name: 'ગુજરાતી', engName: 'Gujarati', value: 'gu' },
  ht: { name: 'Kreyòl Ayisyen', engName: 'Haitian Creole', value: 'ht' },
  ha: { name: 'Hausa', engName: 'Hausa', value: 'ha' },
  he: { name: 'עברית', engName: 'Hebrew', value: 'he' },
  hi: { name: 'हिंदी', engName: 'Hindi', value: 'hi' },
  hu: { name: 'Magyar', engName: 'Hungarian', value: 'hu' },
  is: { name: 'Íslenska', engName: 'Icelandic', value: 'is' },
  id: { name: 'Bahasa Indonesia', engName: 'Indonesian', value: 'id' },
  ga: { name: 'Gaeilge', engName: 'Irish', value: 'ga' },
  it: { name: 'Italiano', engName: 'Italian', value: 'it' },
  ja: { name: '日本語', engName: 'Japanese', value: 'ja' },
  kk: { name: 'Қазақ тілі', engName: 'Kazakh', value: 'kk' },
  rw: { name: 'Ikinyarwanda', engName: 'Kinyarwanda', value: 'rw' },
  ko: { name: '한국어', engName: 'Korean', value: 'ko' },
  lv: { name: 'Latviešu', engName: 'Latvian', value: 'lv' },
  lt: { name: 'Lietuvių', engName: 'Lithuanian', value: 'lt' },
  mi: { name: 'Māori', engName: 'Maori', value: 'mi' },
  ms: { name: 'Bahasa Melayu', engName: 'Malay', value: 'ms' },
  mt: { name: 'Malti', engName: 'Maltese', value: 'mt' },
  no: { name: 'Norsk', engName: 'Norwegian', value: 'no' },
  om: { name: 'Afaan Oromoo', engName: 'Oromo', value: 'om' },
  fa: { name: 'فارسی', engName: 'Persian', value: 'fa' },
  pl: { name: 'Polski', engName: 'Polish', value: 'pl' },
  pt: { name: 'Português', engName: 'Portuguese', value: 'pt' },
  ro: { name: 'Română', engName: 'Romanian', value: 'ro' },
  ru: { name: 'Русский', engName: 'Russian', value: 'ru' },
  sr: { name: 'Српски', engName: 'Serbian', value: 'sr' },
  sl: { name: 'Slovenščina', engName: 'Slovenian', value: 'sl' },
  sk: { name: 'Slovenčina', engName: 'Slovak', value: 'sk' },
  es: { name: 'Español', engName: 'Spanish', value: 'es' },
  sw: { name: 'Kiswahili', engName: 'Swahili', value: 'sw' },
  sv: { name: 'Svenska', engName: 'Swedish', value: 'sv' },
  ta: { name: 'தமிழ்', engName: 'Tamil', value: 'ta' },
  tr: { name: 'Türkçe', engName: 'Turkish', value: 'tr' },
  uk: { name: 'Українська', engName: 'Ukrainian', value: 'uk' },
  ur: { name: 'اردو', engName: 'Urdu', value: 'ur' },
  uz: { name: 'Oʻzbekcha', engName: 'Uzbek', value: 'uz' },
  vi: { name: 'Tiếng Việt', engName: 'Vietnamese', value: 'vi' },
  yo: { name: 'Yorùbá', engName: 'Yoruba', value: 'yo' },
  zu: { name: 'isiZulu', engName: 'Zulu', value: 'zu' }
};

export const LANGUAGES = Object.values(LANGUAGES_DATA).map(({ engName, name, value }) => ({ name: `${engName} (${name})`, value }));

export const DEFAULT_LANGUAGE = 'en';

export const getAvailableLanguages = (excludeLanguage = null) => {
  return LANGUAGES.filter((lang) => lang.value !== excludeLanguage);
};

export const getLanguageData = (value) => {
  return LANGUAGES_DATA[value];
};