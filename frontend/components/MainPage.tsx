import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import KidWizard from './KidWizard';
import PreviewView from './PreviewView';
import MagicLoader from './MagicLoader';
import StoryIntroStream from './StoryIntroStream';
import StoryboardView from './StoryboardView';
import { KidProfile } from '../types';
import { getStory } from '../services/storyApi';
import { mapApiProfileToKidProfile, mapApiStoryToStory } from '../services/storyMappers';
import { useStoryGenerator } from '../hooks/useStoryGenerator';
import { Heading, Text } from './design-system/Typography';

enum AppState {
  ONBOARDING,
  STREAMING_INTRO,
  GENERATING_SCRIPT,
  PREVIEW,
  STORYBOARD,
}

interface IntroStreamState {
  title: string;
  foreword: string;
  isStreaming: boolean;
  isPreparingPreview: boolean;
}

const INITIAL_INTRO_STATE: IntroStreamState = {
  title: '',
  foreword: '',
  isStreaming: false,
  isPreparingPreview: false,
};

const MainPage: React.FC = () => {
  const { id: bookId } = useParams<{ id: string }>();
  const [view, setView] = useState<AppState>(AppState.ONBOARDING);
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [introStream, setIntroStream] = useState<IntroStreamState>(INITIAL_INTRO_STATE);
  // Guards the paint-to-preview transition: we only want to flip to the
  // storybook once the user has had a beat to read the streamed intro.
  const introHoldTimerRef = useRef<number | null>(null);
  // Minimum dwell on the intro view after streaming completes, so the text
  // does not vanish the instant Gemini finishes.
  const INTRO_MIN_HOLD_MS = 600;

  const {
    story,
    setStory,
    setSavedStoryId,
    restorePendingPreview,
    clearPendingPreview,
    generateStoryPreviewStreaming,
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

  const cancelIntroHoldTimer = useCallback(() => {
    if (introHoldTimerRef.current !== null) {
      window.clearTimeout(introHoldTimerRef.current);
      introHoldTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelIntroHoldTimer, [cancelIntroHoldTimer]);

  const handleWizardComplete = async (nextProfile: KidProfile) => {
    setProfile(nextProfile);
    cancelIntroHoldTimer();
    setIntroStream({ ...INITIAL_INTRO_STATE, isStreaming: true });
    setView(AppState.STREAMING_INTRO);

    let lastDeltaAt = Date.now();

    try {
      await generateStoryPreviewStreaming(nextProfile, (field, delta) => {
        lastDeltaAt = Date.now();
        setIntroStream((previous) => ({
          ...previous,
          [field]: previous[field] + delta,
        }));
      });

      setIntroStream((previous) => ({
        ...previous,
        isStreaming: false,
        isPreparingPreview: true,
      }));

      // Keep the intro on-screen for a short beat after the last character
      // arrived so the user can finish reading it before we flip pages.
      const elapsedSinceLastDelta = Date.now() - lastDeltaAt;
      const remainingHold = Math.max(0, INTRO_MIN_HOLD_MS - elapsedSinceLastDelta);

      await new Promise<void>((resolve) => {
        introHoldTimerRef.current = window.setTimeout(() => {
          introHoldTimerRef.current = null;
          resolve();
        }, remainingHold);
      });

      setIntroStream(INITIAL_INTRO_STATE);
      setView(AppState.PREVIEW);
    } catch (err) {
      cancelIntroHoldTimer();
      setIntroStream(INITIAL_INTRO_STATE);
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

      {view === AppState.STREAMING_INTRO && (
        <StoryIntroStream
          title={introStream.title}
          foreword={introStream.foreword}
          isStreaming={introStream.isStreaming}
          isPreparingPreview={introStream.isPreparingPreview}
        />
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
