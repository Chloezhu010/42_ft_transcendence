/**
 * Login page container.
 * Renders login form and handles login logic.
 */
import { useState } from 'react';
import { useAuth } from '@/app/auth';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { SketchyInput } from '@/components/design-system/Forms';
import { SketchyButton } from '@/components/design-system/Primitives';

export function LoginPage(): JSX.Element {
    // state and hooks
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login, currentUser, isLoadingSession } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    if (isLoadingSession) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="font-rounded text-xl text-brand-muted">Loading…</p>
            </div>
        );
    }

    if (currentUser) {
        return <Navigate to="/" replace />;
    }

    // login handler
    async function handleSubmit(e: React.FormEvent): Promise<void> {
        // Prevent form submission from reloading the page
        e.preventDefault();
        // Clear any previous error and set submitting state
        setIsSubmitting(true); 
        setError(null);

        try {
            // Attempt to log in with the provided email and password
            await login(email, password);
            navigate('/');
        } catch (err) {
            // Handle login error
            setError(err instanceof Error? err.message : 'Login failed');
        } finally {
            // Reset submitting state
            setIsSubmitting(false);
        }
    }

    // render
    return (
        <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md bg-white rounded-2xl border-4 border-brand-primary/20 shadow-soft p-10">
                <h1 className="font-sans font-bold text-3xl text-brand-dark text-center mb-8">Welcome back</h1>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-brand-muted mb-2">Email</label>
                            <SketchyInput
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                disabled={isSubmitting}
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-brand-muted mb-2">Password</label>
                            <SketchyInput
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                disabled={isSubmitting}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    {error && (
                        <p role="alert" className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                    <SketchyButton type="submit" disabled={isSubmitting} className="w-full mt-6">
                        {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </SketchyButton>
                </form>
                <p className="text-center text-sm text-brand-muted mt-6">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-bold text-brand-primary hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
