import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SketchyButton } from '@/components/design-system/Primitives';

function HeroSection(): JSX.Element {
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 300], [1, 1.1]);
  const y = useTransform(scrollY, [0, 300], [0, 50]);

  return (
    <section className="relative w-full min-h-[80vh] flex items-center overflow-hidden">
      <motion.div
        style={{ scale, y }}
        className="absolute right-0 top-0 bottom-0 z-0 w-full md:w-[65%] h-full"
      >
        <img
          src="/hero_image.png"
          alt="Funova story world"
          className="w-full h-full object-cover object-center opacity-90"
        />
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-brand-light via-brand-light/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-brand-light via-brand-light to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brand-light/50 to-transparent" />
      </motion.div>

      <div className="relative z-10 px-6 py-12 md:py-20 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 w-full">
        <div className="flex-1 text-center md:text-left max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-semibold text-5xl md:text-7xl leading-tight text-brand-primary mb-6 drop-shadow-sm tracking-normal">
              Your Child&apos;s Imagination, <br />
              <span className="text-brand-dark relative inline-block">
                Sketched to Life.
                <svg
                  className="absolute -bottom-2 left-0 w-full h-4 text-brand-accent -z-10"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path d="M0 5 Q 50 12, 100 5" stroke="currentColor" strokeWidth="12" fill="none" opacity="0.6" />
                </svg>
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-brand-dark mb-10 max-w-lg mx-auto md:mx-0 font-medium">
              Transform simple ideas into personalized, hand-drawn AI comic books.
            </p>

            <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
              <Link to="/create">
                <SketchyButton className="px-8 py-4 text-2xl shadow-xl">Create a Story</SketchyButton>
              </Link>
              <Link to="/gallery">
                <SketchyButton variant="outline" className="px-8 py-4 text-2xl bg-white/80 backdrop-blur-sm">
                  View Gallery
                </SketchyButton>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 hidden md:block" />
      </div>
    </section>
  );
}

export default HeroSection;
