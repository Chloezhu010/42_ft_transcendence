import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function StatefulHarness(): JSX.Element {
  const [value, setValue] = useState('');
  return (
    <div>
      <LanguageSwitcher />
      <label>
        Draft
        <input
          aria-label="draft-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <p data-testid="draft-mirror">{value}</p>
    </div>
  );
}

describe('seamless LTR <-> RTL switching preserves local state', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('keeps in-progress input when switching en -> ar (no remount)', async () => {
    render(<StatefulHarness />);

    const input = screen.getByLabelText('draft-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello world' } });
    expect(input.value).toBe('hello world');

    await act(async () => {
      await i18n.changeLanguage('ar');
    });

    expect(document.documentElement.dir).toBe('rtl');
    expect((screen.getByLabelText('draft-input') as HTMLInputElement).value).toBe('hello world');
    expect(screen.getByTestId('draft-mirror')).toHaveTextContent('hello world');
  });

  it('survives a full ltr -> rtl -> ltr round-trip', async () => {
    render(<StatefulHarness />);

    const input = screen.getByLabelText('draft-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'persisted' } });

    await act(async () => { await i18n.changeLanguage('ar'); });
    expect(document.documentElement.dir).toBe('rtl');
    await act(async () => { await i18n.changeLanguage('fr'); });
    expect(document.documentElement.dir).toBe('ltr');

    expect((screen.getByLabelText('draft-input') as HTMLInputElement).value).toBe('persisted');
  });
});
