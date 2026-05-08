import { describe, expect, it } from 'vitest';
import {
  defaultLanguage,
  getDirectionalArrow,
  getLanguageDirection,
  getSpeechLocale,
  normalizeLanguageCode,
  rtlLanguageCodes,
  supportedLanguageCodes,
  supportedLanguages,
} from '@/i18n.languages';
import translationAR from '@/locales/ar/translation.json';
import translationEN from '@/locales/en/translation.json';
import translationES from '@/locales/es/translation.json';
import translationFR from '@/locales/fr/translation.json';
import translationJA from '@/locales/ja/translation.json';
import translationZH from '@/locales/zh/translation.json';

const localeResources: Record<string, Record<string, unknown>> = {
  ar: translationAR,
  en: translationEN,
  es: translationES,
  fr: translationFR,
  ja: translationJA,
  zh: translationZH,
};

const apiKeyTranslationKeys = [
  'app.apiKeys',
  'apiKeys.title',
  'apiKeys.description',
  'apiKeys.header.eyebrow',
  'apiKeys.create.label',
  'apiKeys.create.placeholder',
  'apiKeys.create.submit',
  'apiKeys.create.creating',
  'apiKeys.created.title',
  'apiKeys.created.description',
  'apiKeys.created.copy',
  'apiKeys.created.copied',
  'apiKeys.created.copyFailed',
  'apiKeys.created.copiedReady',
  'apiKeys.created.dismiss',
  'apiKeys.list.title',
  'apiKeys.list.count',
  'apiKeys.list.loading',
  'apiKeys.list.empty',
  'apiKeys.list.createdAt',
  'apiKeys.list.lastUsedAt',
  'apiKeys.list.neverUsed',
  'apiKeys.status.active',
  'apiKeys.status.revoked',
  'apiKeys.actions.revoke',
  'apiKeys.actions.revoking',
  'apiKeys.actions.confirmRevoke',
  'apiKeys.notifications.revoked',
  'apiKeys.errors.loadFailed',
  'apiKeys.errors.createFailed',
  'apiKeys.errors.revokeFailed',
  'apiKeys.errors.rateLimited',
  'apiKeys.errors.nameRequired',
  'apiKeys.errors.nameTooLong',
];

function lookupTranslation(resource: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, resource);
}

describe('supportedLanguages', () => {
  it('exposes at least one RTL language (subject minor requirement)', () => {
    expect(rtlLanguageCodes.length).toBeGreaterThanOrEqual(1);
    rtlLanguageCodes.forEach((code) => {
      expect(supportedLanguageCodes).toContain(code);
    });
  });

  it('includes Arabic as a supported language with a native label', () => {
    const arabic = supportedLanguages.find((language) => language.code === 'ar');
    expect(arabic).toBeDefined();
    expect(arabic?.label).toBe('العربية');
  });
});

describe('getLanguageDirection', () => {
  it.each([
    ['en', 'ltr'],
    ['fr', 'ltr'],
    ['es', 'ltr'],
    ['zh', 'ltr'],
    ['ja', 'ltr'],
    ['ar', 'rtl'],
  ])('returns %s direction for %s', (code, expected) => {
    expect(getLanguageDirection(code)).toBe(expected);
  });

  it('falls back to ltr for unsupported codes', () => {
    expect(getLanguageDirection('xx')).toBe('ltr');
  });

  it('treats null/undefined as the default ltr language', () => {
    expect(getLanguageDirection(null)).toBe('ltr');
    expect(getLanguageDirection(undefined)).toBe('ltr');
  });

  it('resolves regional Arabic variants (ar-SA, ar-EG) to rtl', () => {
    expect(getLanguageDirection('ar-SA')).toBe('rtl');
    expect(getLanguageDirection('ar-EG')).toBe('rtl');
  });
});

describe('normalizeLanguageCode', () => {
  it('strips the region suffix', () => {
    expect(normalizeLanguageCode('ar-SA')).toBe('ar');
    expect(normalizeLanguageCode('en-US')).toBe('en');
  });

  it('lowercases the code before matching', () => {
    expect(normalizeLanguageCode('AR')).toBe('ar');
    expect(normalizeLanguageCode('Fr-CA')).toBe('fr');
  });

  it('returns the default for null/undefined/unsupported', () => {
    expect(normalizeLanguageCode(null)).toBe(defaultLanguage);
    expect(normalizeLanguageCode(undefined)).toBe(defaultLanguage);
    expect(normalizeLanguageCode('klingon')).toBe(defaultLanguage);
  });
});

describe('getDirectionalArrow', () => {
  it('keeps physical arrows in ltr', () => {
    expect(getDirectionalArrow('back', 'ltr')).toBe('←');
    expect(getDirectionalArrow('forward', 'ltr')).toBe('→');
  });

  it('mirrors arrows in rtl so "back" still points where the reader came from', () => {
    expect(getDirectionalArrow('back', 'rtl')).toBe('→');
    expect(getDirectionalArrow('forward', 'rtl')).toBe('←');
  });
});

describe('getSpeechLocale', () => {
  it('maps Arabic to ar-SA for SpeechSynthesis', () => {
    expect(getSpeechLocale('ar')).toBe('ar-SA');
  });

  it('falls back to the default locale for unsupported languages', () => {
    expect(getSpeechLocale('xx')).toBe('en-US');
  });
});

describe('API key page translations', () => {
  it.each(supportedLanguageCodes)('defines all API key page keys for %s', (code) => {
    const resource = localeResources[code];

    expect(resource).toBeDefined();
    apiKeyTranslationKeys.forEach((key) => {
      expect(lookupTranslation(resource, key), `${code}:${key}`).toEqual(expect.any(String));
    });
  });
});
