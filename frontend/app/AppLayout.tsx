/**
 * Shared application shell around all pages.
 */
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import StorageImage from '@/components/StorageImage';

function AppLayout(): JSX.Element {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-3 px-6 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b-4 border-brand-primary/10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src="/logo-highres.png" alt="WonderComic logo" className="h-14 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            {/* <div className="text-sm text-brand-muted">{authDebugText}</div> */}
            <Link
              to="/gallery"
              className="text-sm font-bold text-brand-muted hover:text-brand-primary transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
            >
              My Library
            </Link>
            {currentUser && (
              <Link
                to="/profile"
                aria-label="Your profile"
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-primary/20 bg-brand-light hover:border-brand-primary transition-colors"
              >
                {currentUser.avatar_url ? (
                  <StorageImage
                    src={currentUser.avatar_url}
                    alt={currentUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-sm font-bold text-brand-primary">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-6 pt-6 flex flex-col flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
