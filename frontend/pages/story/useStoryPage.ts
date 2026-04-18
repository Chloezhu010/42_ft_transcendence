/**
 * Story page controller.
 *
 * Owns local screen state, navigation, and user intent handling.
 * Delegates long-running generation and persistence work to adjacent workflow files.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { ComicPanelData, KidProfile, Story } from '@/types';
import {
  appendIntroDelta,
  createEmptyKidProfile,
  INITIAL_INTRO_STREAM_STATE,
  INTRO_MIN_HOLD_MS,
  parseStoryId,
  readFileAsDataUrl,
  replaceStoryPanel,
  wait,
} from './story.helpers';
import { editStoryPanelImage } from './story.editor';
import {
  generateFullStoryState,
  generatePreviewState,
  loadStoryState,
} from './story.workflow';
import { StoryPageView, type PendingGeneration } from './story.types';

interface UseStoryPageResult {
  view: StoryPageView;
  introStream: typeof INITIAL_INTRO_STREAM_STATE;
  story: Story | null;
  profile: KidProfile | null;
  wizard: {
    step: number;
    profile: KidProfile;
    onProfileChange: (nextProfile: KidProfile) => void;
    onNextStep: () => void;
    onPreviousStep: () => void;
    onPhotoSelect: (file: File) => Promise<void>;
    onPhotoRemove: () => void;
    onSubmit: () => Promise<void>;
  };
  actions: {
    onGenerateFullStory: () => Promise<void>;
    onStartOver: () => void;
    onEditPanelImage: (panel: ComicPanelData, editPrompt: string) => Promise<void>;
  };
}

export function useStoryPage(): UseStoryPageResult {
  const { id: rawStoryId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const introHoldTimerRef = useRef<number | null>(null);

  const [view, setView] = useState<StoryPageView>(StoryPageView.Onboarding);
  const [introStream, setIntroStream] = useState(INITIAL_INTRO_STREAM_STATE);
  const [story, setStory] = useState<Story | null>(null);
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [savedStoryId, setSavedStoryId] = useState<number | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<PendingGeneration | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [draftProfile, setDraftProfile] = useState<KidProfile>(createEmptyKidProfile);

  const cancelIntroHoldTimer = useCallback(() => {
    if (introHoldTimerRef.current !== null) {
      window.clearTimeout(introHoldTimerRef.current);
      introHoldTimerRef.current = null;
    }
  }, []);

  const resetWizard = useCallback(() => {
    setWizardStep(1);
    setDraftProfile(createEmptyKidProfile());
  }, []);

  const resetToOnboarding = useCallback(() => {
    cancelIntroHoldTimer();
    setView(StoryPageView.Onboarding);
    setIntroStream(INITIAL_INTRO_STREAM_STATE);
    setStory(null);
    setProfile(null);
    setSavedStoryId(null);
    setPendingGeneration(null);
    resetWizard();
  }, [cancelIntroHoldTimer, resetWizard]);

  const loadSavedStory = useCallback(async (storyId: number) => {
    setView(StoryPageView.GeneratingStory);

    try {
      const {
        nextPendingGeneration,
        nextProfile,
        nextStory,
        nextView,
      } = await loadStoryState(storyId);

      setProfile(nextProfile);
      setSavedStoryId(storyId);
      setStory(nextStory);
      setPendingGeneration(nextPendingGeneration);
      setView(nextView);
    } catch (error) {
      console.error('Failed to load story:', error);
      toast.error('Failed to load story.');
      resetToOnboarding();
    }
  }, [resetToOnboarding]);

  useEffect(() => {
    const storyId = parseStoryId(rawStoryId);

    if (!rawStoryId) {
      return;
    }

    if (!storyId) {
      toast.error('Invalid story id.');
      navigate('/create', { replace: true });
      return;
    }

    queueMicrotask(() => {
      void loadSavedStory(storyId);
    });
  }, [loadSavedStory, navigate, rawStoryId]);

  useEffect(() => cancelIntroHoldTimer, [cancelIntroHoldTimer]);

  const updateDraftProfile = useCallback((nextProfile: KidProfile) => {
    setDraftProfile(nextProfile);
  }, []);

  const handlePhotoSelect = useCallback(async (file: File) => {
    const photoUrl = await readFileAsDataUrl(file);
    setDraftProfile((previousProfile) => ({
      ...previousProfile,
      photoUrl,
    }));
  }, []);

  const handlePhotoRemove = useCallback(() => {
    setDraftProfile((previousProfile) => ({
      ...previousProfile,
      photoUrl: '',
    }));
  }, []);

  const handleIntroDelta = useCallback((field: 'title' | 'foreword', delta: string) => {
    setIntroStream((previousState) => appendIntroDelta(previousState, field, delta));
  }, []);

  const handleWizardSubmit = useCallback(async () => {
    const nextProfile = draftProfile;

    setProfile(nextProfile);
    cancelIntroHoldTimer();
    setIntroStream({
      ...INITIAL_INTRO_STREAM_STATE,
      isStreaming: true,
    });
    setView(StoryPageView.StreamingIntro);

    let lastDeltaAt = Date.now();

    try {
      const { nextPendingGeneration } = await generatePreviewState(
        nextProfile,
        (field, delta) => {
          lastDeltaAt = Date.now();
          handleIntroDelta(field, delta);
        },
      );

      setIntroStream((previousState) => ({
        ...previousState,
        isStreaming: false,
        isPreparingPreview: true,
      }));

      const elapsedSinceLastDelta = Date.now() - lastDeltaAt;
      const remainingHold = Math.max(0, INTRO_MIN_HOLD_MS - elapsedSinceLastDelta);

      introHoldTimerRef.current = window.setTimeout(() => {
        introHoldTimerRef.current = null;
      }, remainingHold);
      await wait(remainingHold);

      setIntroStream(INITIAL_INTRO_STREAM_STATE);
      setSavedStoryId(nextPendingGeneration.previewStoryId);
      setPendingGeneration(nextPendingGeneration);
      setStory(nextPendingGeneration.previewStory);
      setView(StoryPageView.Preview);
    } catch (error) {
      cancelIntroHoldTimer();
      setIntroStream(INITIAL_INTRO_STREAM_STATE);

      const message = error instanceof Error ? error.message : 'Story generation failed.';
      toast.error(message);
      setView(StoryPageView.Onboarding);
    }
  }, [cancelIntroHoldTimer, draftProfile, handleIntroDelta]);

  const handleGenerateFullStory = useCallback(async () => {
    if (!pendingGeneration) {
      toast.error('Preview expired. Please generate again.');
      resetToOnboarding();
      return;
    }

    setView(StoryPageView.GeneratingStory);

    try {
      const updatedStory = await generateFullStoryState(pendingGeneration);
      setStory(updatedStory);
      setPendingGeneration(null);
      setSavedStoryId(pendingGeneration.previewStoryId);
      setView(StoryPageView.Storyboard);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Story generation failed.';
      toast.error(message);
      setView(StoryPageView.Preview);
    }
  }, [pendingGeneration, resetToOnboarding]);

  const handleStartOver = useCallback(() => {
    resetToOnboarding();
  }, [resetToOnboarding]);

  const handlePanelImageEdit = useCallback(async (panel: ComicPanelData, editPrompt: string) => {
    if (!story?.characterDescription || !panel.imageUrl) {
      return;
    }

    try {
      const updatedPanel = await editStoryPanelImage({
        artStyle: profile?.artStyle,
        editPrompt,
        panel,
        savedStoryId,
        story,
      });

      setStory((previousStory) => (
        previousStory ? replaceStoryPanel(previousStory, updatedPanel) : previousStory
      ));
      setPendingGeneration((previousPendingGeneration) => {
        if (!previousPendingGeneration) {
          return previousPendingGeneration;
        }

        return {
          ...previousPendingGeneration,
          previewStory: replaceStoryPanel(previousPendingGeneration.previewStory, updatedPanel),
        };
      });
    } catch (error) {
      console.error('Failed to edit panel image:', error);
      toast.error('Failed to update the panel image.');
      throw error;
    }
  }, [profile, savedStoryId, story]);

  return {
    view,
    introStream,
    story,
    profile,
    wizard: {
      step: wizardStep,
      profile: draftProfile,
      onProfileChange: updateDraftProfile,
      onNextStep: () => setWizardStep((previousStep) => Math.min(5, previousStep + 1)),
      onPreviousStep: () => setWizardStep((previousStep) => Math.max(1, previousStep - 1)),
      onPhotoSelect: handlePhotoSelect,
      onPhotoRemove: handlePhotoRemove,
      onSubmit: handleWizardSubmit,
    },
    actions: {
      onGenerateFullStory: handleGenerateFullStory,
      onStartOver: handleStartOver,
      onEditPanelImage: handlePanelImageEdit,
    },
  };
}
