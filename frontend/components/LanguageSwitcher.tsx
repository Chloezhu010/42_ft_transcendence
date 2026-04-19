import React, { useEffect } from 'react';
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
  const language = i18n.resolvedLanguage || i18n.language;
  const direction = i18n.dir(language);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="relative">
      <select
        aria-label="Select language"
        value={language || 'en'}
        onChange={handleLanguageChange}
        className="appearance-none rounded-full border border-brand-primary/20 bg-brand-light/70 px-4 py-2 pr-9 text-sm font-bold text-brand-primary shadow-sm transition-colors hover:border-brand-primary/40 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
      >
        {languages.map((lng) => (
          <option key={lng.code} value={lng.code}>
            {lng.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-brand-muted"
      >
        ▾
      </span>
    </div>
  );
};

export default LanguageSwitcher;
