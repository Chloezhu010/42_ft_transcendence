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
    <div className="language-switcher">
      <select 
        value={language || 'en'} 
        onChange={handleLanguageChange}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: '1px solid #ccc',
          cursor: 'pointer'
        }}
      >
        {languages.map((lng) => (
          <option key={lng.code} value={lng.code}>
            {lng.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
