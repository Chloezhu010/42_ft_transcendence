import { useCallback, useState } from 'react';
import {
  GeneratedStoryScript,
  generatePanelImage,
  KidProfileForGeneration,
  StoryIntroField,
  streamStoryScript,
} from '../services/generationApi';
import { imageSourceToPureBase64 } from '../services/imageUtils';
import { getStory, saveStory, updatePanelImage, updateStory } from '../services/storyApi';
import { mapApiStoryToStory, mapKidProfileToGenerationProfile } from '../services/storyMappers';
import { KidProfile, Story, ComicPanelData } from '../types';

export type IntroDeltaHandler = (field: StoryIntroField, delta: string) => void;

interface PendingGeneration {
  profileForApi: KidProfileForGeneration;
  previewStory: Story;
  previewStoryId: number;
}

export const useStoryGenerator = () => {
  const [story, setStory] = useState<Story | null>(null);
  const [savedStoryId, setSavedStoryId] = useState<number | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<PendingGeneration | null>(null);

  const buildPreviewStory = async (
    profileForApi: KidProfileForGeneration,
    script: GeneratedStoryScript
  ): Promise<Story> => {
    if (!script.panels.length) {
      throw new Error('Story generation failed: no panels returned.');
    }

    const lastPanelIndex = script.panels.length - 1;
    const [firstImage, lastImage] = await Promise.all([
      generatePanelImage(
        script.panels[0].imagePrompt,
        script.characterDescription,
        profileForApi.art_style
      ),
      generatePanelImage(
        script.panels[lastPanelIndex].imagePrompt,
        script.characterDescription,
        profileForApi.art_style
      ),
    ]);

    return {
      title: script.title,
      foreword: script.foreword,
      characterDescription: script.characterDescription,
      coverImagePrompt: script.coverImagePrompt,
      panels: script.panels.map((panel, index) => ({
        id: panel.id || String(index + 1),
        text: panel.text,
        imagePrompt: panel.imagePrompt,
        imageUrl: index === 0 ? firstImage : index === lastPanelIndex ? lastImage : undefined,
        isGenerating: false,
      })),
    };
  };

  const persistPreviewStory = async (
    profileForApi: KidProfileForGeneration,
    previewStory: Story
  ): Promise<number> => {
    const previewPanels = await Promise.all(
      previewStory.panels.map(async (panel, index) => ({
        panel_order: index,
        text: panel.text,
        image_prompt: panel.imagePrompt,
        image_base64: panel.imageUrl ? await imageSourceToPureBase64(panel.imageUrl) : undefined,
      }))
    );

    return saveStory({
      profile: {
        name: profileForApi.name,
        gender: profileForApi.gender,
        skin_tone: profileForApi.skin_tone,
        hair_color: profileForApi.hair_color,
        eye_color: profileForApi.eye_color,
        favorite_color: profileForApi.favorite_color,
        dream: profileForApi.dream,
        archetype: profileForApi.archetype,
      },
      title: previewStory.title,
      foreword: previewStory.foreword,
      character_description: previewStory.characterDescription,
      cover_image_prompt: previewStory.coverImagePrompt,
      panels: previewPanels,
    });
  };

  const finalizePreview = (
    profileForApi: KidProfileForGeneration,
    previewStory: Story,
    previewStoryId: number
  ) => {
    setSavedStoryId(previewStoryId);
    setPendingGeneration({ profileForApi, previewStory, previewStoryId });
    setStory(previewStory);
  };

  /**
   * Generate a story preview whose title and foreword stream in through the
   * provided `onIntroDelta` callback. The promise resolves only once the
   * preview images are ready and the draft has been saved, so callers can
   * safely transition to the storybook view immediately afterwards.
   */
  const generateStoryPreviewStreaming = async (
    p: KidProfile,
    onIntroDelta: IntroDeltaHandler
  ) => {
    const profileForApi = mapKidProfileToGenerationProfile(p);
    const script = await streamStoryScript(profileForApi, { onIntroDelta });
    const previewStory = await buildPreviewStory(profileForApi, script);
    const previewStoryId = await persistPreviewStory(profileForApi, previewStory);
    finalizePreview(profileForApi, previewStory, previewStoryId);
  };

  const generateFullStoryFromPreview = async () => {
    if (!pendingGeneration) {
      throw new Error('No preview is available. Please generate a preview first.');
    }

    const { profileForApi, previewStory, previewStoryId } = pendingGeneration;
    const lastPanelIndex = previewStory.panels.length - 1;

    const coverImagePromise = generatePanelImage(
      previewStory.coverImagePrompt,
      previewStory.characterDescription,
      profileForApi.art_style
    );
    const panelImagePromises = previewStory.panels.map(async (panel, index) => {
      if (index === 0 || index === lastPanelIndex) {
        if (!panel.imageUrl) {
          throw new Error('Preview images are missing. Please regenerate the preview.');
        }
        return imageSourceToPureBase64(panel.imageUrl);
      }
      const generatedImage = await generatePanelImage(
        panel.imagePrompt,
        previewStory.characterDescription,
        profileForApi.art_style
      );
      return imageSourceToPureBase64(generatedImage);
    });

    const [coverImage, panelImageBase64List] = await Promise.all([
      coverImagePromise,
      Promise.all(panelImagePromises),
    ]);
    const coverImageBase64 = await imageSourceToPureBase64(coverImage);

    await updateStory(previewStoryId, {
      is_unlocked: true,
      cover_image_base64: coverImageBase64,
      panels: previewStory.panels.map((panel, index) => ({
        panel_order: index,
        text: panel.text,
        image_prompt: panel.imagePrompt,
        image_base64: panelImageBase64List[index],
      })),
    });

    const savedStory = await getStory(previewStoryId);
    setSavedStoryId(previewStoryId);
    setStory(mapApiStoryToStory(savedStory));
    setPendingGeneration(null);
  };

  const restorePendingPreview = useCallback((storyId: number, storyFromDb: Story, profile: KidProfile) => {
    const profileForApi = mapKidProfileToGenerationProfile(profile);
    setSavedStoryId(storyId);
    setStory(storyFromDb);
    setPendingGeneration({
      profileForApi,
      previewStory: storyFromDb,
      previewStoryId: storyId,
    });
  }, []);

  const clearPendingPreview = useCallback(() => {
    setPendingGeneration(null);
  }, []);

  const updatePanel = async (updated: ComicPanelData) => {
    if (!story) return;

    const panelOrder = story.panels.findIndex(p => p.id === updated.id);

    setStory(previousStory => {
      if (!previousStory) return previousStory;
      return {
        ...previousStory,
        panels: previousStory.panels.map(panel =>
          panel.id === updated.id ? updated : panel
        ),
      };
    });

    setPendingGeneration(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        previewStory: {
          ...prev.previewStory,
          panels: prev.previewStory.panels.map(p => p.id === updated.id ? updated : p),
        },
      };
    });

    if (savedStoryId && panelOrder !== -1 && updated.imageUrl) {
      try {
        await updatePanelImage(savedStoryId, panelOrder, updated.imageUrl);
      } catch (err) {
        console.error('Failed to save panel edit:', err);
      }
    }
  };

  return {
    story,
    setStory,
    savedStoryId,
    setSavedStoryId,
    generateStoryPreviewStreaming,
    generateFullStoryFromPreview,
    restorePendingPreview,
    clearPendingPreview,
    hasPendingPreview: Boolean(pendingGeneration),
    updatePanel,
  };
};
