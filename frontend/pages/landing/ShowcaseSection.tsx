import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SketchyCard } from '@/components/design-system/Primitives';

interface ShowcaseStory {
  title: string;
  category: string;
  image: string;
}

function ShowcaseSection(): JSX.Element {
  const { t } = useTranslation();
  const stories = t('landing.showcase.stories', { returnObjects: true }) as ShowcaseStory[];
  const duplicatedStories = [...stories, ...stories, ...stories];

  return (
    <section id="gallery" className="py-24 bg-brand-primary text-white w-full overflow-hidden">
      <div className="w-full">
        <div className="text-center mb-16 px-6">
          <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-brand-accent">{t('landing.showcase.title')}</h2>
          <p className="text-xl text-white/80 font-medium max-w-2xl mx-auto">
            {t('landing.showcase.subtitle')}
          </p>
        </div>

        <div className="relative w-full py-10">
          <motion.div
            className="flex gap-10 px-4"
            animate={{ x: [0, -stories.length * 360] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 35,
                ease: 'linear',
              },
            }}
            style={{ width: 'max-content' }}
          >
            {duplicatedStories.map((story, index) => (
              <SketchyCard
                key={`${story.title}-${index}`}
                className="w-[320px] aspect-[3/4] bg-white p-0 overflow-hidden border-4 border-white/20 flex flex-col flex-shrink-0"
                shadowColor="rgba(0,0,0,0.25)"
                style={{ borderRadius: '24px' }}
                disableHoverEffect
              >
                <div className="flex-1 overflow-hidden relative">
                  <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-5 bg-white text-center border-t-2 border-brand-primary/10">
                  <span className="text-brand-dark font-black text-xl tracking-tight">{story.title}</span>
                  <div className="text-brand-muted text-sm font-semibold uppercase tracking-wider mt-1">
                    {story.category}
                  </div>
                </div>
              </SketchyCard>
            ))}
          </motion.div>
        </div>

        <div className="text-center mt-8 px-6 opacity-60">
          <p className="text-xs uppercase tracking-widest font-semibold">
            {t('landing.showcase.disclaimer')}
          </p>
        </div>
      </div>
    </section>
  );
}

export default ShowcaseSection;
