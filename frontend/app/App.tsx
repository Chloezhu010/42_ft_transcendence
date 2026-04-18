/**
 * Top-level route tree for the frontend.
 * Keeps page entrypoints explicit and all routes under the shared layout.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { GalleryPage } from '@/pages/gallery';
import { StoryPage } from '@/pages/story';
import { LoginPage } from '@/pages/auth';
import { SignupPage } from '@/pages/auth';
import { ProfilePage } from '@/pages/profile';
import AppLayout from './AppLayout';
import ProtectedRoute from './ProtectedRoute';

export function App(): JSX.Element {
  return (
    <div className="min-h-screen selection:bg-brand-accent selection:text-brand-dark bg-brand-light flex flex-col font-sans">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* Protected routes: ProtectedRoute, then AppLayout, then the page */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<StoryPage />} />
            <Route path="/book/:id" element={<StoryPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        {/* Catch-all route for 404s: redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
