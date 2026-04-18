import { useState } from 'react';
import { useAuth } from '@/app/auth';
import { SketchyInput } from '@/components/design-system/Forms';
import { AuthFormPage } from './AuthFormPage';

export function LoginPage(): JSX.Element {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, currentUser, isLoadingSession } = useAuth();

    return (
        <AuthFormPage
            currentUser={currentUser}
            footerLinkLabel="Sign up"
            footerLinkTo="/signup"
            footerText="Don't have an account?"
            renderFields={(isSubmitting) => (
                <>
                    <div>
                        <label className="mb-2 block text-sm font-bold text-brand-muted">Email</label>
                        <SketchyInput
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            disabled={isSubmitting}
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-bold text-brand-muted">Password</label>
                        <SketchyInput
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            disabled={isSubmitting}
                            placeholder="••••••••"
                        />
                    </div>
                </>
            )}
            isLoadingSession={isLoadingSession}
            submitLabel="Sign in"
            submittingLabel="Signing in…"
            title="Welcome back"
            onSubmit={() => login(email, password)}
        />
    );
}
