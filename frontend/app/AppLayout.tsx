/**
 * Shared application shell around all pages.
 */
import { Link, Outlet } from 'react-router-dom';

function AppLayout(): JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-3 px-6 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b-4 border-brand-primary/10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src="/logo-highres.png" alt="WonderComic logo" className="h-14 w-auto object-contain" />
          </Link>
          <Link
            to="/gallery"
            className="text-sm font-bold text-brand-muted hover:text-brand-primary transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
          >
            My Library
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-6 pt-6 flex flex-col flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
