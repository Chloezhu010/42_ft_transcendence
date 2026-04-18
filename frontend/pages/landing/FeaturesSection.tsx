import { SketchyCard } from '@/components/design-system/Primitives';

const features = [
  {
    image: '/ai-sketch-engine.png',
    title: 'AI Sketch Engine',
    description: 'Our engine turns a character brief into vibrant, hand-drawn comic panels in moments.',
    rotateClassName: '-rotate-1',
  },
  {
    image: '/kid-safe-content.png',
    title: 'Kid-Safe Content',
    description: 'The project is aimed at family-friendly story generation with positive, age-appropriate framing.',
    rotateClassName: 'rotate-1',
  },
  {
    image: '/printed-keepsakes.png',
    title: 'Saved Keepsakes',
    description: 'Completed stories stay in the gallery so families can revisit favorite adventures after generation.',
    rotateClassName: '-rotate-1',
  },
];

function FeaturesSection(): JSX.Element {
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="font-semibold text-4xl md:text-5xl text-brand-primary mb-4">Why WonderComic?</h2>
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
