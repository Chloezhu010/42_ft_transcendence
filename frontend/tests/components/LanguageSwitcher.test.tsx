import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('renders dir="ltr" wrapper for English', () => {
    const { container } = render(<LanguageSwitcher />);
    expect(container.firstChild).toHaveAttribute('dir', 'ltr');
  });

  it('renders dir="rtl" wrapper after switching to Arabic', async () => {
    await act(async () => {
      await i18n.changeLanguage('ar');
    });
    const { container } = render(<LanguageSwitcher />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });

  it('opens the menu and selects Arabic, persisting through i18n', async () => {
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole('button', { name: /language/i });
    fireEvent.click(trigger);

    const menu = await screen.findByRole('menu');
    const arabicOption = within(menu).getByRole('menuitemradio', { name: /العربية/ });
    await act(async () => {
      fireEvent.click(arabicOption);
      await Promise.resolve();
    });

    expect(i18n.resolvedLanguage).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('uses logical-property utility classes (ps-/pe-/start-/end-) so the trigger mirrors automatically', () => {
    const { container } = render(<LanguageSwitcher />);
    const trigger = container.querySelector('button');
    expect(trigger?.className).toMatch(/(^|\s)(ps-|pe-|text-start|text-end)/);
    expect(trigger?.className).not.toMatch(/(^|\s)(pl-|pr-|text-left|text-right)\b/);
  });
});
