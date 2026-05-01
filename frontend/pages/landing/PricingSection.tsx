import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getSketchyButtonClassName, SketchyCard } from '@/components/design-system/Primitives';

function PricingSection(): JSX.Element {
  const { t } = useTranslation();
  const createFeatures = t('landing.pricing.create.features', { returnObjects: true }) as string[];
  const libraryFeatures = t('landing.pricing.library.features', { returnObjects: true }) as string[];

  return (
    <section id="project-highlights" className="py-24 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="font-semibold text-4xl md:text-5xl text-brand-primary mb-4">{t('landing.pricing.title')}</h2>
        <p className="text-xl text-brand-muted font-medium">{t('landing.pricing.subtitle')}</p>
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-10">
        <SketchyCard
          className="w-full max-w-sm bg-white p-10 relative transform -rotate-1 transition-all hover:rotate-0"
          style={{ borderRadius: '32px' }}
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-brand-light/80 backdrop-blur-sm transform rotate-2 border-2 border-brand-primary/10 shadow-sm rounded-lg" />

          <h3 className="font-semibold text-4xl text-brand-dark mb-2">{t('landing.pricing.create.title')}</h3>
          <p className="text-brand-muted mb-8 border-b-4 border-brand-light pb-4 font-semibold">
            {t('landing.pricing.create.description')}
          </p>

          <ul className="space-y-4 font-semibold text-brand-dark mb-8">
            {createFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2">✨ {feature}</li>
            ))}
          </ul>

          <Link
            to="/create"
            className={`flex w-full items-center justify-center ${getSketchyButtonClassName('outline', 'py-4 text-xl rounded-2xl')}`}
            style={{ borderRadius: '16px' }}
          >
            {t('landing.pricing.create.cta')}
          </Link>
        </SketchyCard>

        <SketchyCard
          className="w-full max-w-sm bg-white p-10 relative transform rotate-1 transition-all hover:rotate-0 z-10"
          style={{ borderRadius: '32px', border: '4px solid var(--color-brand-primary)' }}
          shadowColor="rgba(242, 201, 76, 0.4)"
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-brand-accent/80 backdrop-blur-sm transform -rotate-1 border-2 border-brand-primary/10 shadow-sm rounded-lg" />

          <div className="absolute top-4 right-4 text-xs font-semibold bg-brand-accent text-brand-dark px-3 py-1.5 rounded-full border-2 border-brand-primary transform rotate-12 shadow-soft">
            {t('landing.pricing.library.badge')}
          </div>

          <h3 className="font-semibold text-4xl text-brand-primary mb-2">{t('landing.pricing.library.title')}</h3>
          <p className="text-brand-primary/70 mb-8 border-b-4 border-brand-light pb-4 font-semibold">
            {t('landing.pricing.library.description')}
          </p>

          <ul className="space-y-4 font-semibold text-brand-dark mb-8">
            {libraryFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2">🚀 {feature}</li>
            ))}
          </ul>

          <Link
            to="/gallery"
            className={`flex w-full items-center justify-center ${getSketchyButtonClassName('primary', 'py-4 text-xl rounded-2xl')}`}
            style={{ borderRadius: '16px' }}
          >
            {t('landing.pricing.library.cta')}
          </Link>
        </SketchyCard>
      </div>
    </section>
  );
}

export default PricingSection;
