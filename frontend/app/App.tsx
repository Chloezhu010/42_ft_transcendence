/**
 * Top-level route tree for the frontend.
 * Keeps page entrypoints explicit and all routes under the shared layout.
 */
import { Route, Routes } from 'react-router-dom';
import { GalleryPage } from '@/pages/gallery';
import { StoryPage } from '@/pages/story';
import { LoginPage } from '@/pages/auth';
import { SignupPage } from '@/pages/auth';
import AppLayout from './AppLayout';

export function App(): JSX.Element {
  return (
    <div className="min-h-screen selection:bg-brand-accent selection:text-brand-dark bg-brand-light flex flex-col font-sans">
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<StoryPage />} />
          <Route path="/book/:id" element={<StoryPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>
      </Routes>
    </div>
  );
}
