import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/auth';
import { SketchyInput } from '@/components/design-system/Forms';
import { AuthFormPage } from './AuthFormPage';

export function SignupPage(): JSX.Element {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { signup, currentUser, isLoadingSession } = useAuth();

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
                            disabled={isSubmitting}
                            placeholder={t('auth.fields.passwordPlaceholder')}
                        />
                    </div>
                </>
            )}
            isLoadingSession={isLoadingSession}
            submitLabel={t('auth.signup.submit')}
            submittingLabel={t('auth.signup.submitting')}
            title={t('auth.signup.title')}
            onSubmit={() => signup(email, username, password)}
        />
    );
}
