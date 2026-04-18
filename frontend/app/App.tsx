/**
 * Top-level route tree for the frontend.
 * Keeps page entrypoints explicit and all routes under the shared layout.
 */
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { GalleryPage } from '@/pages/gallery';
import { LandingPage } from '@/pages/landing';
import { LegalPage } from '@/pages/legal';
import { StoryPage } from '@/pages/story';
import AppLayout from './AppLayout';

function ScrollToTop(): null {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

function App(): JSX.Element {
  return (
    <div className="min-h-screen selection:bg-brand-accent selection:text-brand-dark bg-brand-light flex flex-col font-sans">
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<StoryPage />} />
          <Route path="/book/:id" element={<StoryPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/privacy" element={<LegalPage documentKey="privacy" />} />
          <Route path="/terms" element={<LegalPage documentKey="terms" />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
