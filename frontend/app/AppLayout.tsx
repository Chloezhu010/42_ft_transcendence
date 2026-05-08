/**
 * Shared application shell around all pages.
 */
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/auth';
import StorageImage from '@/components/StorageImage';
import LanguageSwitcher from '../components/LanguageSwitcher';

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
  const { t } = useTranslation();
  const location = useLocation();
  const { currentUser } = useAuth();

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
            <img src="/logo-highres.png" alt={t('app.logoAlt')} className="h-14 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-2 text-sm font-bold">
            <LanguageSwitcher />
            {showCreateLink ? (
              <Link
                to="/create"
                className="text-brand-primary hover:text-brand-dark transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
              >
                {t('app.createStory', { defaultValue: 'Create Story' })}
              </Link>
            ) : null}
            <Link
              to="/gallery"
              className="text-brand-muted hover:text-brand-primary transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
            >
              {t('app.myLibrary')}
            </Link>
            <Link
              to="/friends"
              className="text-brand-muted hover:text-brand-primary transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
            >
              {t('app.friends', { defaultValue: 'Friends' })}
            </Link>
            <Link
              to="/api-keys"
              className="text-brand-muted hover:text-brand-primary transition-colors px-4 py-2 rounded-full hover:bg-brand-light"
            >
              {t('app.apiKeys', { defaultValue: 'API keys' })}
            </Link>
            {currentUser ? (
              <Link
                to="/profile"
                aria-label={t('app.profileAriaLabel')}
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
            ) : null}
          </div>
        </div>
      </header>

      <main className={mainClassName}>
        <Outlet />
      </main>

      <footer className="border-t border-brand-primary/10 bg-white/92 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="font-rounded text-2xl text-brand-primary">Funova</div>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              {t('app.footer.tagline', { defaultValue: 'AI comic book generator.' })}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-semibold text-brand-primary">
            <Link className="hover:text-brand-dark" to="/create">{t('app.footer.links.create', { defaultValue: 'Create' })}</Link>
            <Link className="hover:text-brand-dark" to="/gallery">{t('app.footer.links.library', { defaultValue: 'Library' })}</Link>
            <Link className="hover:text-brand-dark" to="/privacy">{t('app.footer.links.privacy', { defaultValue: 'Privacy Policy' })}</Link>
            <Link className="hover:text-brand-dark" to="/terms">{t('app.footer.links.terms', { defaultValue: 'Terms of Service' })}</Link>
            <Link className="hover:text-brand-dark" to="/status">{t('app.footer.links.status', { defaultValue: 'Status' })}</Link>
            <a
              className="hover:text-brand-dark"
              href="https://github.com/Chloezhu010/42_ft_transcendence"
              rel="noreferrer"
              target="_blank"
            >
              {t('app.footer.links.repository', { defaultValue: 'Repository' })}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
