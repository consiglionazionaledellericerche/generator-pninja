import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { z } from "zod";
import { zodI18nMap } from "zod-i18n-map";
import zodTranslationEN from 'zod-i18n-map/locales/en/zod.json';
import zodTranslationDE from 'zod-i18n-map/locales/de/zod.json';
import zodTranslationFR from 'zod-i18n-map/locales/fr/zod.json';
import zodTranslationIT from 'zod-i18n-map/locales/it/zod.json';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'de', 'fr', 'it'],
    fallbackLng: 'en',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Percorso da adattare alla tua struttura
    },
    ns: ['translation', 'zod'],
    defaultNS: 'translation',
    resources: {
      en: { zod: zodTranslationEN },
      de: { zod: zodTranslationDE },
      fr: { zod: zodTranslationFR },
      it: { zod: zodTranslationIT }
    },
    interpolation: {
      escapeValue: false // non necessario per react
    },
    react: {
      useSuspense: true, // importante per il caricamento lazy
    },
    debug: process.env.NODE_ENV === 'development',
    partialBundledLanguages: true,
  });

z.setErrorMap(zodI18nMap);

export default i18n;
