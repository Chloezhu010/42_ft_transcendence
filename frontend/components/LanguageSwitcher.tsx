import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ar', label: 'العربية' }
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const language = i18n.resolvedLanguage || i18n.language;
  const direction = i18n.dir(language);
  const currentLanguageLabel = useMemo(() => {
    return languages.find((lng) => lng.code === language)?.label || 'English';
  }, [language]);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

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
          {languages.map((lng) => {
            const isActive = lng.code === language;

            return (
              <button
                key={lng.code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => handleLanguageChange(lng.code)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-brand-light text-brand-primary'
                    : 'text-brand-dark hover:bg-brand-light/70'
                }`}
              >
                <span>{lng.label}</span>
                {isActive ? <span className="text-brand-muted">•</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default LanguageSwitcher;
