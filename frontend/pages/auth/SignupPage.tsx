import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/auth';
import { SketchyInput } from '@/components/design-system/Forms';
import { AuthFormPage } from './AuthFormPage';
import {
    EMAIL_PATTERN,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    USERNAME_MAX_LENGTH,
} from './authValidation';

export function SignupPage(): JSX.Element {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { signup, currentUser, isLoadingSession } = useAuth();

    function getValidationError(): string | null {
        const trimmedEmail = email.trim();
        const trimmedUsername = username.trim();

        if (!trimmedEmail) {
            return t('auth.errors.emailRequired');
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            return t('auth.errors.emailInvalid');
        }
        if (!trimmedUsername) {
            return t('auth.errors.usernameRequired');
        }
        if (trimmedUsername.length > USERNAME_MAX_LENGTH) {
            return t('auth.errors.usernameTooLong');
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

    async function submitSignup(): Promise<void> {
        const validationError = getValidationError();
        if (validationError) {
            throw new Error(validationError);
        }

        await signup(email.trim(), username.trim(), password);
    }

    return (
        <AuthFormPage
            currentUser={currentUser}
            footerLinkLabel={t('auth.signup.footerLink')}
            footerLinkTo="/login"
            footerText={t('auth.signup.footerText')}
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
                            {t('auth.fields.usernameLabel')}
                        </label>
                        <SketchyInput
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            required
                            maxLength={USERNAME_MAX_LENGTH}
                            disabled={isSubmitting}
                            placeholder={t('auth.fields.usernamePlaceholder')}
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
            successMessage={t('auth.signup.notifications.accountCreated')}
            submitLabel={t('auth.signup.submit')}
            submittingLabel={t('auth.signup.submitting')}
            title={t('auth.signup.title')}
            useAppValidation
            onSubmit={submitSignup}
        />
    );
}
