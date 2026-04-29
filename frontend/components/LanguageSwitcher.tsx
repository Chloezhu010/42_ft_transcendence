import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultLanguage, normalizeLanguageCode, supportedLanguages } from '@/i18n.languages';

function getLanguageLabel(languageCode: string): string {
  return (
    supportedLanguages.find((language) => language.code === languageCode)?.label
    || supportedLanguages.find((language) => language.code === defaultLanguage)?.label
    || 'English'
  );
}

function LanguageSwitcher(): JSX.Element {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resolvedLanguage = i18n.resolvedLanguage || i18n.language || defaultLanguage;
  const language = normalizeLanguageCode(resolvedLanguage);
  const currentLanguageLabel = getLanguageLabel(language);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLanguageChange = (nextLanguage: string): void => {
    void i18n.changeLanguage(nextLanguage);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Select language"
        onClick={() => setIsOpen((previous) => !previous)}
        className="min-w-[7.5rem] rounded-full border border-brand-primary/15 bg-white/85 px-4 py-2 pr-9 text-sm font-bold text-brand-primary shadow-sm backdrop-blur-sm transition-colors hover:border-brand-primary/35 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/60"
      >
        {currentLanguageLabel}
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted"
      >
        ▾
      </span>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Language options"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-full overflow-hidden rounded-[1.35rem] border border-brand-primary/15 bg-white/95 p-2 shadow-[0_16px_40px_rgba(74,43,106,0.16)] backdrop-blur-md"
        >
          {supportedLanguages.map((supportedLanguage) => {
            const isActive = supportedLanguage.code === language;

            return (
              <button
                key={supportedLanguage.code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => handleLanguageChange(supportedLanguage.code)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-brand-light text-brand-primary'
                    : 'text-brand-dark hover:bg-brand-light/70'
                }`}
              >
                <span>{supportedLanguage.label}</span>
                {isActive ? <span className="text-brand-muted">•</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default LanguageSwitcher;
