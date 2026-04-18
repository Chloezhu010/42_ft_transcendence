/**
 * Shared application shell around all pages.
 */
import { Link, Outlet, useLocation } from 'react-router-dom';

function isMarketingRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/privacy' || pathname === '/terms';
}

function getMainClassName(pathname: string): string {
  if (isMarketingRoute(pathname)) {
    return 'flex flex-col flex-1';
  }

  return 'max-w-7xl mx-auto w-full px-6 pt-6 flex flex-col flex-1';
}

function AppLayout(): JSX.Element {
  const location = useLocation();

  if (isMarketingRoute(location.pathname)) {
    return <Outlet />;
  }

  const showCreateLink = location.pathname !== '/create';
  const mainClassName = getMainClassName(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-3 px-6 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b-4 border-brand-primary/10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <Link to="/" className="flex items-center">
            <img src="/logo-highres.png" alt="WonderComic logo" className="h-14 w-auto object-contain" />
          </Link>

          <nav className="flex items-center gap-2 text-sm font-bold">
            {showCreateLink ? (
              <Link
                to="/create"
                className="text-brand-primary hover:text-brand-dark transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
              >
                Create Story
              </Link>
            ) : null}
            <Link
              to="/gallery"
              className="text-brand-muted hover:text-brand-primary transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
            >
              My Library
            </Link>
          </nav>
        </div>
      </header>

      <main className={mainClassName}>
        <Outlet />
      </main>

      <footer className="border-t border-brand-primary/10 bg-white/92 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="font-rounded text-2xl text-brand-primary">WonderComic</div>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              A student-built AI comic book generator for the 42 ft_transcendence project.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-semibold text-brand-primary">
            <Link className="hover:text-brand-dark" to="/create">Create Story</Link>
            <Link className="hover:text-brand-dark" to="/gallery">Library</Link>
            <Link className="hover:text-brand-dark" to="/privacy">Privacy Policy</Link>
            <Link className="hover:text-brand-dark" to="/terms">Terms of Service</Link>
            <a
              className="hover:text-brand-dark"
              href="https://github.com/Chloezhu010/42_ft_transcendence"
              rel="noreferrer"
              target="_blank"
            >
              Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
