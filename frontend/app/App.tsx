/**
 * Top-level route tree for the frontend.
 * Keeps page entrypoints explicit and all routes under the shared layout.
 */
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage, SignupPage } from '@/pages/auth';
import { FriendLibraryPage } from '@/pages/friend-library';
import { GalleryPage } from '@/pages/gallery';
import { LandingPage } from '@/pages/landing';
import { LegalPage } from '@/pages/legal';
import { StatusPage } from '@/pages/status';
import { ProfilePage } from '@/pages/profile';
import { StoryPage } from '@/pages/story';
import { FriendsPage } from '@/pages/friends';
import AppLayout from './AppLayout';
import ProtectedRoute from './ProtectedRoute';

function ScrollToTop(): null {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

export function App(): JSX.Element {
  return (
    <div className="min-h-screen selection:bg-brand-accent selection:text-brand-dark bg-brand-light flex flex-col font-sans">
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<LegalPage documentKey="privacy" />} />
          <Route path="/terms" element={<LegalPage documentKey="terms" />} />
          <Route path="/status" element={<StatusPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/create" element={<StoryPage />} />
            <Route path="/book/:id" element={<StoryPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/friends/:userId/library" element={<FriendLibraryPage />} />
            <Route path="/friends/:userId/library/:id" element={<StoryPage />} />
          </Route>
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
