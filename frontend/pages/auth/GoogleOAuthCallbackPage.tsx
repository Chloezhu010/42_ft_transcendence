import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/app/auth';

const OAUTH_REDIRECT_PATH_KEY = 'auth.oauthRedirectPath';

function isSafeInternalPath(path: string | null | undefined): path is string {
    if (!path) return false;
    if (!path.startsWith('/')) return false;
    // Reject protocol-relative ("//host") and backslash variants ("/\\host"),
    // which browsers resolve to external origins.
    if (path.startsWith('//') || path.startsWith('/\\')) return false;
    return true;
}

function getSavedOAuthRedirectPath(): string | null {
    const savedPath = sessionStorage.getItem(OAUTH_REDIRECT_PATH_KEY);
    sessionStorage.removeItem(OAUTH_REDIRECT_PATH_KEY);

    return isSafeInternalPath(savedPath) ? savedPath : null;
}

function getDestination(nextParam: string | null): string {
    if (isSafeInternalPath(nextParam)) {
        return nextParam;
    }
    return getSavedOAuthRedirectPath() ?? '/';
}

function getOAuthErrorMessage(errorParam: string, t: (key: string) => string): string {
    if (errorParam === 'link_conflict') {
        return t('auth.oauth.errors.linkConflict');
    }
    return t('auth.oauth.errors.cancelled');
}

export function GoogleOAuthCallbackPage(): JSX.Element {
    const { t } = useTranslation();
    const { completeGoogleOAuth, isLoadingSession } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [exchangeError, setExchangeError] = useState<string | null>(null);
    const exchangeStarted = useRef(false);
    const urlErrorNotified = useRef(false);

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const [destination] = useState(() => getDestination(searchParams.get('next')));

    const urlError = errorParam
        ? getOAuthErrorMessage(errorParam, t)
        : !code
          ? t('auth.oauth.errors.missingCode')
          : null;

    useEffect(() => {
        if (!urlError || urlErrorNotified.current) return;
        urlErrorNotified.current = true;
        toast.error(urlError);
    }, [urlError]);

    useEffect(() => {
        if (urlError) return;
        if (isLoadingSession) return;
        // Guard against StrictMode double-invocation and stale re-runs: the backend
        // issues one-time OAuth codes, so a second exchange call would always fail.
        if (exchangeStarted.current) return;
        exchangeStarted.current = true;

        completeGoogleOAuth(code!)
            .then(() => {
                toast.success(t('auth.oauth.notifications.signInComplete'));
                navigate(destination, { replace: true });
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : t('auth.oauth.notifications.signInFailed');
                setExchangeError(message);
                toast.error(message);
            });
    }, [code, completeGoogleOAuth, destination, isLoadingSession, navigate, t, urlError]);

    const error = urlError ?? exchangeError;
    const isFailed = error !== null;

    return (
        <div
            data-testid="google-oauth-callback"
            className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 py-12"
        >
            {isFailed ? (
                <div className="w-full rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-brand-dark">{t('auth.oauth.callback.failedTitle')}</h1>
                    <p role="alert" className="mt-4 text-sm text-brand-muted">
                        {error}
                    </p>
                    <p className="mt-3 text-sm text-brand-muted">
                        {t('auth.oauth.callback.retryDescription')}
                    </p>
                    <Link
                        to="/login"
                        className="mt-6 inline-flex rounded-full bg-brand-dark px-5 py-3 text-sm font-semibold text-white"
                    >
                        {t('auth.oauth.callback.backToLogin')}
                    </Link>
                </div>
            ) : (
                <div className="w-full rounded-3xl border border-brand-accent/20 bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-brand-dark">{t('auth.oauth.callback.signingInTitle')}</h1>
                    <p className="mt-4 text-sm text-brand-muted">
                        {t('auth.oauth.callback.signingInDescription')}
                    </p>
                </div>
            )}
        </div>
    );
}
