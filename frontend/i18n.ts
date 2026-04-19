import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { defaultLanguage, supportedLanguageCodes } from './i18n.languages';

// Import translations
import translationEN from './locales/en/translation.json';
import translationFR from './locales/fr/translation.json';
import translationES from './locales/es/translation.json';
import translationZH from './locales/zh/translation.json';
import translationJA from './locales/ja/translation.json';
import translationAR from './locales/ar/translation.json';

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR },
  es: { translation: translationES },
  zh: { translation: translationZH },
  ja: { translation: translationJA },
  ar: { translation: translationAR }
};

function syncDocumentLanguage(languageCode: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = languageCode;
  document.documentElement.dir = i18n.dir(languageCode);
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguageCodes,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    }
  })
  .then(() => {
    syncDocumentLanguage(i18n.resolvedLanguage || i18n.language || defaultLanguage);
  });

i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
