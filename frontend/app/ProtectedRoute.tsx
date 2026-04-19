import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth';

/**
 * Route wrapper that gates child routes behind an authenticated session.
 */
export default function ProtectedRoute(): JSX.Element {
    const { currentUser, isLoadingSession } = useAuth();
    const location = useLocation();

    if (isLoadingSession) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="font-rounded text-xl text-brand-muted">Loading…</p>
            </div>
        );
    }
    if (!currentUser) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}
