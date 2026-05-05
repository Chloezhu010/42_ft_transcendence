export interface SupportedLanguage {
  code: string;
  label: string;
}

export type LanguageDirection = 'ltr' | 'rtl';

export const defaultLanguage = 'en';
export const rtlLanguageCodes = ['ar'];

export const supportedLanguages: SupportedLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ar', label: 'العربية' },
];

export const supportedLanguageCodes = supportedLanguages.map((language) => language.code);

const speechLocales: Record<string, string> = {
  ar: 'ar-SA',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

export function normalizeLanguageCode(languageCode: string | null | undefined): string {
  if (!languageCode) {
    return defaultLanguage;
  }

  const lower = languageCode.toLowerCase();
  if (supportedLanguageCodes.includes(lower)) {
    return lower;
  }

  const base = lower.split('-')[0];
  if (supportedLanguageCodes.includes(base)) {
    return base;
  }

  return defaultLanguage;
}

export function getLanguageDirection(languageCode: string | null | undefined): LanguageDirection {
  const normalizedCode = normalizeLanguageCode(languageCode);

  return rtlLanguageCodes.includes(normalizedCode) ? 'rtl' : 'ltr';
}

export function getSpeechLocale(languageCode: string | null | undefined): string {
  const normalizedCode = normalizeLanguageCode(languageCode);

  return speechLocales[normalizedCode] ?? speechLocales[defaultLanguage];
}

export function getDirectionalArrow(
  direction: 'back' | 'forward',
  languageDirection: LanguageDirection,
): string {
  const isBack = direction === 'back';
  if (languageDirection === 'rtl') {
    return isBack ? '→' : '←';
  }

  return isBack ? '←' : '→';
}
