import { useTranslation } from 'react-i18next';
import { SketchyCard } from '@/components/design-system/Primitives';

interface FeatureItem {
  image: string;
  title: string;
  description: string;
  rotateClassName: string;
}

function FeaturesSection(): JSX.Element {
  const { t } = useTranslation();
  const features = t('landing.features.items', { returnObjects: true }) as FeatureItem[];

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="font-semibold text-4xl md:text-5xl text-brand-primary mb-4">{t('landing.features.title')}</h2>
        <div className="h-2 w-32 bg-brand-accent mx-auto rounded-full shadow-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <SketchyCard
            key={feature.title}
            className={`p-10 flex flex-col items-center text-center ${feature.rotateClassName} bg-white`}
            style={{ borderRadius: '32px' }}
          >
            <div className="mb-8 flex items-center justify-center">
              <img src={feature.image} alt={feature.title} className="w-24 h-24 object-contain" />
            </div>
            <h3 className="font-semibold text-3xl text-brand-dark mb-4">{feature.title}</h3>
            <p className="text-lg text-brand-muted leading-relaxed font-medium">{feature.description}</p>
          </SketchyCard>
        ))}
      </div>
    </section>
  );
}

export default FeaturesSection;
