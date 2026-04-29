import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { UserResponse } from '@api';
import { SketchyButton } from '@/components/design-system/Primitives';

interface AuthFormPageProps {
    currentUser: UserResponse | null;
    footerLinkLabel: string;
    footerLinkTo: string;
    footerText: string;
    isLoadingSession: boolean;
    renderFields: (isSubmitting: boolean) => ReactNode;
    submitLabel: string;
    submittingLabel: string;
    title: string;
    onSubmit: () => Promise<void>;
}

export function AuthFormPage({
    currentUser,
    footerLinkLabel,
    footerLinkTo,
    footerText,
    isLoadingSession,
    renderFields,
    submitLabel,
    submittingLabel,
    title,
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
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit();
            navigate(redirectPath, { replace: true });
        } catch (error) {
            setError(error instanceof Error ? error.message : t('auth.errors.authFailed'));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoadingSession) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="font-rounded text-xl text-brand-muted">{t('auth.status.loading')}</p>
            </div>
        );
    }

    if (currentUser) {
        return <Navigate to={redirectPath} replace />;
    }

    return (
        <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md rounded-2xl border-4 border-brand-primary/20 bg-white p-10 shadow-soft">
                <h1 className="mb-8 text-center font-sans text-3xl font-bold text-brand-dark">{title}</h1>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">{renderFields(isSubmitting)}</div>
                    {error && (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
                        >
                            {error}
                        </p>
                    )}
                    <SketchyButton type="submit" disabled={isSubmitting} className="mt-6 w-full">
                        {isSubmitting ? submittingLabel : submitLabel}
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
        </div>
    );
}
