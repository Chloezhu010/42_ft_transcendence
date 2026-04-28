export interface SupportedLanguage {
  code: string;
  label: string;
}

export const defaultLanguage = 'en';

export const supportedLanguages: SupportedLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ar', label: 'العربية' },
];

export const supportedLanguageCodes = supportedLanguages.map((language) => language.code);

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
