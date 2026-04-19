import { useState } from 'react';
import { useAuth } from '@/app/auth';
import { SketchyInput } from '@/components/design-system/Forms';
import { AuthFormPage } from './AuthFormPage';

export function SignupPage(): JSX.Element {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { signup, currentUser, isLoadingSession } = useAuth();

    return (
        <AuthFormPage
            currentUser={currentUser}
            footerLinkLabel="Log in"
            footerLinkTo="/login"
            footerText="Already have an account?"
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
                        <label className="mb-2 block text-sm font-bold text-brand-muted">Username</label>
                        <SketchyInput
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            required
                            disabled={isSubmitting}
                            placeholder="your_username"
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
            submitLabel="Sign up"
            submittingLabel="Signing up…"
            title="Create your account"
            onSubmit={() => signup(email, username, password)}
        />
    );
}
