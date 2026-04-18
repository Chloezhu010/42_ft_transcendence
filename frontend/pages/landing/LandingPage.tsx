import { Link } from 'react-router-dom';
import FeaturesSection from './FeaturesSection';
import MarketingFooter from './MarketingFooter';
import HeroSection from './HeroSection';
import HowItWorksSection from './HowItWorksSection';
import PricingSection from './PricingSection';
import ShowcaseSection from './ShowcaseSection';

function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col w-full min-h-screen font-sans text-brand-dark bg-brand-light selection:bg-brand-accent">
      <nav className="flex justify-between items-center px-6 py-4 md:px-12 max-w-7xl mx-auto w-full z-50">
        <Link to="/" className="cursor-pointer flex items-center">
          <img src="/logo-highres.png" alt="Funova logo" className="h-28 w-auto object-contain" />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-xl font-bold text-brand-dark">
          <a href="#how-it-works" className="hover:text-brand-primary transition-colors">How it Works</a>
          <a href="#gallery" className="hover:text-brand-primary transition-colors">Gallery</a>
          <a href="#project-highlights" className="hover:text-brand-primary transition-colors">Explore</a>
        </div>

        <Link
          to="/create"
          className="px-6 py-2 text-xl font-black bg-brand-accent text-brand-dark border-4 border-brand-primary rounded-[32px] transition-all hover:scale-105 active:scale-95 shadow-soft"
        >
          Start Creating
        </Link>
      </nav>

      <main className="flex-1 w-full">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ShowcaseSection />
        <PricingSection />
      </main>

      <MarketingFooter />
    </div>
  );
}

export default LandingPage;
