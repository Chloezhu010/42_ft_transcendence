/**
 * Shared shell for LoginPage and SignupPage. Owns the cross-cutting concerns:
 * AuthFormPage owns the title, error alert, submit button, and footer chrome.
 */
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { UserResponse } from '@api';
import { startGoogleOAuth } from '@api';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { SketchyButton } from '@/components/design-system/Primitives';

const OAUTH_REDIRECT_PATH_KEY = 'auth.oauthRedirectPath';
const INVALID_CREDENTIALS_ERROR = 'invalid email or password';
const OAUTH_PASSWORD_LOGIN_ERROR = 'this account does not use password login';
const EMAIL_TAKEN_ERROR = 'email already taken';
const USERNAME_TAKEN_ERROR = 'username already taken';

interface AuthFormPageProps {
    currentUser: UserResponse | null;
    footerLinkLabel: string;
    footerLinkTo: string;
    footerText: string;
    isLoadingSession: boolean;
    renderFields: (isSubmitting: boolean) => ReactNode;
    successMessage?: string;
    submitLabel: string;
    submittingLabel: string;
    title: string;
    useAppValidation?: boolean;
    onSubmit: () => Promise<void>;
}

function saveOAuthRedirectPath(path: string): void {
    sessionStorage.setItem(OAUTH_REDIRECT_PATH_KEY, path);
}

function getLocalizedAuthErrorMessage(error: unknown, t: (key: string) => string): string {
    if (!(error instanceof Error)) {
        return t('auth.errors.authFailed');
    }

    const normalizedMessage = error.message.trim().replace(/\.$/, '').toLowerCase();
    if (normalizedMessage === INVALID_CREDENTIALS_ERROR) {
        return t('auth.errors.invalidCredentials');
    }
    if (normalizedMessage === OAUTH_PASSWORD_LOGIN_ERROR) {
        return t('auth.errors.oauthPasswordLogin');
    }
    if (normalizedMessage === EMAIL_TAKEN_ERROR) {
        return t('auth.errors.emailTaken');
    }
    if (normalizedMessage === USERNAME_TAKEN_ERROR) {
        return t('auth.errors.usernameTaken');
    }

    return error.message;
}

function AuthPageShell({ children }: { children: ReactNode }): JSX.Element {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="flex justify-end px-6 py-4">
                <LanguageSwitcher />
            </header>
            <main className="flex flex-1 items-center justify-center px-6 py-12">
                {children}
            </main>
        </div>
    );
}

export function AuthFormPage({
    currentUser,
    footerLinkLabel,
    footerLinkTo,
    footerText,
    isLoadingSession,
    renderFields,
    successMessage,
    submitLabel,
    submittingLabel,
    title,
    useAppValidation = false,
    onSubmit,
}: AuthFormPageProps): JSX.Element {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo =
        (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)
            ?.from;
    const redirectPath = redirectTo
        ? `${redirectTo.pathname ?? '/'}${redirectTo.search ?? ''}${redirectTo.hash ?? ''}`
        : '/';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOAuthStarting, setIsOAuthStarting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            await onSubmit();
            if (successMessage) {
                toast.success(successMessage);
            }
            navigate(redirectPath, { replace: true });
        } catch (error) {
            const message = getLocalizedAuthErrorMessage(error, t);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleGoogleSignIn(): void {
        setIsOAuthStarting(true);
        saveOAuthRedirectPath(redirectPath);
        startGoogleOAuth();
    }

    if (isLoadingSession) {
        return (
            <AuthPageShell>
                <p className="font-rounded text-xl text-brand-muted">{t('auth.status.loading')}</p>
            </AuthPageShell>
        );
    }

    if (currentUser) {
        return <Navigate to={redirectPath} replace />;
    }

    return (
        <AuthPageShell>
            <div className="w-full max-w-md rounded-2xl border-4 border-brand-primary/20 bg-white p-10 shadow-soft">
                <h1 className="mb-8 text-center font-sans text-3xl font-bold text-brand-dark">{title}</h1>
                <form onSubmit={handleSubmit} noValidate={useAppValidation}>
                    <div className="space-y-6">{renderFields(isSubmitting)}</div>
                    <SketchyButton type="submit" disabled={isSubmitting} className="mt-6 w-full">
                        {isSubmitting ? submittingLabel : submitLabel}
                    </SketchyButton>
                    <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wide text-brand-muted">
                        <span className="h-px flex-1 bg-brand-muted/30" />
                        <span>{t('auth.oauth.separator')}</span>
                        <span className="h-px flex-1 bg-brand-muted/30" />
                    </div>
                    <SketchyButton
                        type="button"
                        variant="outline"
                        disabled={isSubmitting || isOAuthStarting}
                        onClick={handleGoogleSignIn}
                        className="mt-6 w-full"
                    >
                        {isOAuthStarting ? t('auth.oauth.redirectingToGoogle') : t('auth.oauth.continueWithGoogle')}
                    </SketchyButton>
                </form>
                <p className="mt-6 text-center text-sm text-brand-muted">
                    {footerText}{' '}
                    <Link
                        to={footerLinkTo}
                        state={redirectTo ? { from: redirectTo } : undefined}
                        className="font-bold text-brand-primary hover:underline"
                    >
                        {footerLinkLabel}
                    </Link>
                </p>
            </div>
        </AuthPageShell>
    );
}
