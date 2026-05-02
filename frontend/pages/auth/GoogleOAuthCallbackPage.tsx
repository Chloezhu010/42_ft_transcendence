import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

function getOAuthErrorMessage(errorParam: string): string {
    if (errorParam === 'link_conflict') {
        return 'This Google account matches an email that already uses password login. Sign in with email and password instead.';
    }
    return 'Google sign-in was cancelled or failed. Please try again.';
}

export function GoogleOAuthCallbackPage(): JSX.Element {
    const { completeGoogleOAuth } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [exchangeError, setExchangeError] = useState<string | null>(null);
    const exchangeStarted = useRef(false);

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const [destination] = useState(() => getDestination(searchParams.get('next')));

    const urlError = errorParam
        ? getOAuthErrorMessage(errorParam)
        : !code
          ? 'No authorization code found. Please try signing in with Google again.'
          : null;

    useEffect(() => {
        if (urlError) return;
        // Guard against StrictMode double-invocation and stale re-runs: the backend
        // issues one-time OAuth codes, so a second exchange call would always fail.
        if (exchangeStarted.current) return;
        exchangeStarted.current = true;

        completeGoogleOAuth(code!)
            .then(() => navigate(destination, { replace: true }))
            .catch((err: unknown) => {
                setExchangeError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
            });
    }, [code, completeGoogleOAuth, destination, navigate, urlError]);

    const error = urlError ?? exchangeError;
    const isFailed = error !== null;

    return (
        <div
            data-testid="google-oauth-callback"
            className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6 py-12"
        >
            {isFailed ? (
                <div className="w-full rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-brand-dark">Google sign-in failed</h1>
                    <p role="alert" className="mt-4 text-sm text-brand-muted">
                        {error}
                    </p>
                    <p className="mt-3 text-sm text-brand-muted">
                        Please retry the Google sign-in flow from the login page.
                    </p>
                    <Link
                        to="/login"
                        className="mt-6 inline-flex rounded-full bg-brand-dark px-5 py-3 text-sm font-semibold text-white"
                    >
                        Back to login
                    </Link>
                </div>
            ) : (
                <div className="w-full rounded-3xl border border-brand-accent/20 bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-brand-dark">Signing you in</h1>
                    <p className="mt-4 text-sm text-brand-muted">
                        Completing your Google sign-in and preparing your session.
                    </p>
                </div>
            )}
        </div>
    );
}
