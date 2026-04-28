import { useTranslation } from 'react-i18next';
import { SketchyCard } from '@/components/design-system/Primitives';
import { SketchArrow } from './SketchIcons';

interface StepItem {
  number: string;
  title: string;
  description: string;
  image: string;
}

function HowItWorksSection(): JSX.Element {
  const { t } = useTranslation();
  const steps = t('landing.howItWorks.steps', { returnObjects: true }) as StepItem[];

  return (
    <section
      id="how-it-works"
      className="py-24 px-6 bg-white/50 border-y-4 border-brand-primary/10 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <h2 className="font-semibold text-4xl md:text-5xl text-brand-primary mb-16">{t('landing.howItWorks.title')}</h2>

        <div className="flex flex-col md:flex-row justify-center items-stretch gap-8 md:gap-4">
          {steps.map((step, index) => (
            <div key={step.number} className="contents">
              <div className="relative group">
                <SketchyCard
                  shadowColor="rgba(157, 107, 207, 0.2)"
                  className="w-72 flex flex-col items-center relative group-hover:scale-105 overflow-hidden p-0 h-full"
                  style={{ borderRadius: '32px' }}
                >
                  <div className="absolute top-2 left-2 w-10 h-10 bg-brand-accent border-2 border-brand-primary rounded-full flex items-center justify-center font-bold text-xl z-20 text-brand-dark shadow-sm">
                    {step.number}
                  </div>

                  <div className="w-full h-48 overflow-hidden flex items-center justify-center bg-white">
                    <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="p-6 text-center">
                    <h3 className="font-semibold text-2xl mb-2 text-brand-dark">{step.title}</h3>
                    <p className="text-brand-muted font-medium">{step.description}</p>
                  </div>
                </SketchyCard>
              </div>

              {index < steps.length - 1 ? (
                <>
                  <div className="hidden md:block transform -rotate-12 opacity-30">
                    <SketchArrow className="w-24 h-12 text-brand-primary" />
                  </div>
                  <div className="md:hidden transform rotate-90 my-4">
                    <SketchArrow className="w-16 h-8 text-brand-dark" />
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
