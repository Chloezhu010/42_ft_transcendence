import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/auth';
import { SketchyInput } from '@/components/design-system/Forms';
import { AuthFormPage } from './AuthFormPage';
import { EMAIL_PATTERN, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './authValidation';

export function LoginPage(): JSX.Element {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, currentUser, isLoadingSession } = useAuth();

    function getValidationError(): string | null {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            return t('auth.errors.emailRequired');
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            return t('auth.errors.emailInvalid');
        }
        if (!password) {
            return t('auth.errors.passwordRequired');
        }
        if (password.length < PASSWORD_MIN_LENGTH) {
            return t('auth.errors.passwordTooShort');
        }
        if (password.length > PASSWORD_MAX_LENGTH) {
            return t('auth.errors.passwordTooLong');
        }

        return null;
    }

    async function submitLogin(): Promise<void> {
        const validationError = getValidationError();
        if (validationError) {
            throw new Error(validationError);
        }

        await login(email.trim(), password);
    }

    return (
        <AuthFormPage
            currentUser={currentUser}
            footerLinkLabel={t('auth.login.footerLink')}
            footerLinkTo="/signup"
            footerText={t('auth.login.footerText')}
            renderFields={(isSubmitting) => (
                <>
                    <div>
                        <label className="mb-2 block text-sm font-bold text-brand-muted">
                            {t('auth.fields.emailLabel')}
                        </label>
                        <SketchyInput
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            disabled={isSubmitting}
                            placeholder={t('auth.fields.emailPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-bold text-brand-muted">
                            {t('auth.fields.passwordLabel')}
                        </label>
                        <SketchyInput
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            minLength={PASSWORD_MIN_LENGTH}
                            maxLength={PASSWORD_MAX_LENGTH}
                            disabled={isSubmitting}
                            placeholder={t('auth.fields.passwordPlaceholder')}
                        />
                    </div>
                </>
            )}
            isLoadingSession={isLoadingSession}
            submitLabel={t('auth.login.submit')}
            submittingLabel={t('auth.login.submitting')}
            title={t('auth.login.title')}
            useAppValidation
            onSubmit={submitLogin}
        />
    );
}
