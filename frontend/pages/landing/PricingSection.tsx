import { Link } from 'react-router-dom';
import { SketchyButton, SketchyCard } from '@/components/design-system/Primitives';

function PricingSection(): JSX.Element {
  return (
    <section id="project-highlights" className="py-24 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="font-semibold text-4xl md:text-5xl text-brand-primary mb-4">Start Exploring</h2>
        <p className="text-xl text-brand-muted font-medium">Two simple ways to see the project in action.</p>
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-10">
        <SketchyCard
          className="w-full max-w-sm bg-white p-10 relative transform -rotate-1 transition-all hover:rotate-0"
          style={{ borderRadius: '32px' }}
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-brand-light/80 backdrop-blur-sm transform rotate-2 border-2 border-brand-primary/10 shadow-sm rounded-lg" />

          <h3 className="font-semibold text-4xl text-brand-dark mb-2">Create</h3>
          <p className="text-brand-muted mb-8 border-b-4 border-brand-light pb-4 font-semibold">
            Build a new comic from a character idea
          </p>

          <ul className="space-y-4 font-semibold text-brand-dark mb-8">
            <li className="flex items-center gap-2">✨ Character profile flow</li>
            <li className="flex items-center gap-2">✨ Streaming title and foreword</li>
            <li className="flex items-center gap-2">✨ Editable comic panels</li>
          </ul>

          <Link to="/create" className="block">
            <SketchyButton variant="outline" className="w-full py-4 text-xl rounded-2xl" style={{ borderRadius: '16px' }}>
              Start Creating
            </SketchyButton>
          </Link>
        </SketchyCard>

        <SketchyCard
          className="w-full max-w-sm bg-white p-10 relative transform rotate-1 transition-all hover:rotate-0 z-10"
          style={{ borderRadius: '32px', border: '4px solid #9D6BCF' }}
          shadowColor="rgba(157, 107, 207, 0.4)"
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-brand-accent/80 backdrop-blur-sm transform -rotate-1 border-2 border-brand-primary/10 shadow-sm rounded-lg" />

          <div className="absolute top-4 right-4 text-xs font-semibold bg-brand-accent text-brand-dark px-3 py-1.5 rounded-full border-2 border-brand-primary transform rotate-12 shadow-soft">
            QUICK TOUR
          </div>

          <h3 className="font-semibold text-4xl text-brand-primary mb-2">Library</h3>
          <p className="text-brand-primary/70 mb-8 border-b-4 border-brand-light pb-4 font-semibold">
            Reopen saved books and review finished output
          </p>

          <ul className="space-y-4 font-semibold text-brand-dark mb-8">
            <li className="flex items-center gap-2">🚀 Browse generated covers</li>
            <li className="flex items-center gap-2">🚀 Open any saved story</li>
            <li className="flex items-center gap-2">🚀 Review the final storyboard</li>
          </ul>

          <Link to="/gallery" className="block">
            <SketchyButton className="w-full py-4 text-xl rounded-2xl" style={{ borderRadius: '16px' }}>
              Open Library
            </SketchyButton>
          </Link>
        </SketchyCard>
      </div>
    </section>
  );
}

export default PricingSection;
