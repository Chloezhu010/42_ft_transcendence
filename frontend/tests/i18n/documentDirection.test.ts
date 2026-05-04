import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';

describe('document direction syncs with the active language', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('starts ltr/en after init', () => {
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('flips <html dir="rtl" lang="ar"> when switching to Arabic', async () => {
    await i18n.changeLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('flips back to ltr when leaving Arabic', async () => {
    await i18n.changeLanguage('ar');
    await i18n.changeLanguage('fr');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('handles repeated round-trips without leaking state', async () => {
    for (const code of ['ar', 'en', 'ar', 'es', 'ar']) {
      await i18n.changeLanguage(code);
    }
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('normalizes regional codes when syncing the html attributes', async () => {
    await i18n.changeLanguage('ar-SA');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });
});
