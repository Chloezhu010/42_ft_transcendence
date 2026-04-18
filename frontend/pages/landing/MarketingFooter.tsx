import { Link } from 'react-router-dom';

function MarketingFooter(): JSX.Element {
  return (
    <footer className="bg-white text-brand-dark py-16 px-6 relative overflow-hidden border-t-4 border-brand-primary/10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center">
            <img src="/logo-highres.png" alt="WonderComic logo" className="h-40 w-auto object-contain" />
          </div>
          <p className="text-brand-muted text-lg max-w-sm text-center md:text-left font-medium">
            Empowering the next generation of storytellers with a little bit of magic and AI.
          </p>
        </div>

        <div className="flex gap-8 font-bold text-xl">
          <Link to="/privacy" className="hover:text-brand-primary transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-brand-primary transition-colors">Terms</Link>
          <a
            href="https://github.com/Chloezhu010/42_ft_transcendence"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-primary transition-colors"
          >
            Repository
          </a>
        </div>

        <div className="text-center md:text-right">
          <p className="font-bold text-2xl mb-2 text-brand-primary">Made for little dreamers</p>
          <p className="text-sm text-brand-muted font-bold">© 2026 WonderComic</p>
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
