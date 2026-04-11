import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import KidWizard from './KidWizard';
import PreviewView from './PreviewView';
import MagicLoader from './MagicLoader';
import StoryboardView from './StoryboardView';
import { KidProfile } from '../types';
import { getStory } from '../services/storyApi';
import { mapApiProfileToKidProfile, mapApiStoryToStory } from '../services/storyMappers';
import { useStoryGenerator } from '../hooks/useStoryGenerator';
import { Heading, Text } from './design-system/Typography';

enum AppState {
  ONBOARDING,
  GENERATING_SCRIPT,
  PREVIEW,
  STORYBOARD,
}

const MainPage: React.FC = () => {
  const { id: bookId } = useParams<{ id: string }>();
  const [view, setView] = useState<AppState>(AppState.ONBOARDING);
  const [profile, setProfile] = useState<KidProfile | null>(null);

  const {
    story,
    setStory,
    setSavedStoryId,
    restorePendingPreview,
    clearPendingPreview,
    generateStoryPreview,
    generateFullStoryFromPreview,
    hasPendingPreview,
    updatePanel,
  } = useStoryGenerator();

  const loadStoryFromHistory = useCallback(async (storyId: number) => {
    setView(AppState.GENERATING_SCRIPT);

    try {
      const data = await getStory(storyId);
      const loadedStory = mapApiStoryToStory(data);
      const loadedProfile = mapApiProfileToKidProfile(data.profile);

      setProfile(loadedProfile);

      const hasMissingPanelImage = loadedStory.panels.some(panel => !panel.imageUrl);
      const isPreviewDraft = !loadedStory.coverImageUrl || hasMissingPanelImage;

      if (isPreviewDraft) {
        restorePendingPreview(storyId, loadedStory, loadedProfile);
        setView(AppState.PREVIEW);
        return;
      }

      clearPendingPreview();
      setStory(loadedStory);
      setSavedStoryId(storyId);
      setView(AppState.STORYBOARD);
    } catch (err) {
      console.error('Failed to load story:', err);
      toast.error('Failed to load story');
      setView(AppState.ONBOARDING);
    }
  }, [clearPendingPreview, restorePendingPreview, setSavedStoryId, setStory]);

  useEffect(() => {
    if (!bookId) {
      return;
    }

    const parsedStoryId = Number(bookId);
    if (!Number.isInteger(parsedStoryId) || parsedStoryId <= 0) {
      toast.error('Invalid story id.');
      setView(AppState.ONBOARDING);
      return;
    }

    void loadStoryFromHistory(parsedStoryId);
  }, [bookId, loadStoryFromHistory]);

  const handleWizardComplete = async (nextProfile: KidProfile) => {
    setProfile(nextProfile);
    setView(AppState.GENERATING_SCRIPT);

    try {
      await generateStoryPreview(nextProfile);
      setView(AppState.PREVIEW);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      toast.error(message);
      setView(AppState.ONBOARDING);
    }
  };

  const handleGenerateFullStory = async () => {
    if (!hasPendingPreview) {
      toast.error('Preview expired. Please generate again.');
      setView(AppState.ONBOARDING);
      return;
    }

    setView(AppState.GENERATING_SCRIPT);

    try {
      await generateFullStoryFromPreview();
      setView(AppState.STORYBOARD);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      toast.error(message);
      setView(AppState.PREVIEW);
    }
  };

  const handleStartOver = () => {
    clearPendingPreview();
    setStory(null);
    setProfile(null);
    setView(AppState.ONBOARDING);
  };

  return (
    <>
      {view === AppState.ONBOARDING && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="text-center mb-10">
            <Heading variant="h1" className="mb-4 text-brand-dark">
              Your Child's <span className="text-brand-primary underline decoration-brand-accent decoration-8">Legend</span>
            </Heading>
            <Text className="text-brand-muted italic">Transform bedtime stories into cinematic comic book experiences.</Text>
          </div>
          <KidWizard onSubmit={handleWizardComplete} />
        </div>
      )}

      {view === AppState.GENERATING_SCRIPT && <MagicLoader />}

      {view === AppState.PREVIEW && story && (
        <PreviewView
          story={story}
          profile={profile}
          updatePanel={updatePanel}
          onGenerate={handleGenerateFullStory}
          onStartOver={handleStartOver}
        />
      )}

      {view === AppState.STORYBOARD && story && (
        <StoryboardView
          story={story}
          profile={profile}
          updatePanel={updatePanel}
        />
      )}
    </>
  );
};

export default MainPage;
