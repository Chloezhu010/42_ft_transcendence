import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/auth';
import { SketchyInput } from '@/components/design-system/Forms';
import { AuthFormPage } from './AuthFormPage';

export function LoginPage(): JSX.Element {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, currentUser, isLoadingSession } = useAuth();

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
            onSubmit={() => login(email, password)}
        />
    );
}
