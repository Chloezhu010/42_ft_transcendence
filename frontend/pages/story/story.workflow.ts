/**
 * Story generation workflows used by the story page controller.
 *
 * Covers the three long-running paths in this feature: loading saved stories,
 * generating a preview, and finalizing the full story.
 */
import {
  generatePanelImage,
  getStory,
  saveStory,
  streamStoryScript,
  type StoryIntroField,
  updateStory,
} from '@api';
import type { KidProfile, Story } from '@/types';
import {
  imageSourceToPureBase64,
  mapApiProfileToKidProfile,
  mapApiStoryToStory,
  mapKidProfileToGenerationProfile,
} from '@/utils';
import { isPreviewDraft } from './story.helpers';
import { StoryPageView, type PendingGeneration } from './story.types';

interface LoadedStoryState {
  nextProfile: KidProfile;
  nextStory: Story;
  nextPendingGeneration: PendingGeneration | null;
  nextView: StoryPageView.Preview | StoryPageView.Storyboard;
}

interface GeneratedPreviewState {
  nextPendingGeneration: PendingGeneration;
}

export async function loadStoryState(accessToken: string, storyId: number): Promise<LoadedStoryState> {
  const savedStory = await getStory(accessToken, storyId);
  const nextStory = mapApiStoryToStory(savedStory);
  const nextProfile = mapApiProfileToKidProfile(savedStory.profile);
  const profileForApi = mapKidProfileToGenerationProfile(nextProfile);

  if (isPreviewDraft(nextStory)) {
    return {
      nextProfile,
      nextStory,
      nextPendingGeneration: {
        profileForApi,
        previewStory: nextStory,
        previewStoryId: storyId,
      },
      nextView: StoryPageView.Preview,
    };
  }

  return {
    nextProfile,
    nextStory,
    nextPendingGeneration: null,
    nextView: StoryPageView.Storyboard,
  };
}

async function buildPreviewStory(
  accessToken: string,
  profileForApi: PendingGeneration['profileForApi'],
  script: Awaited<ReturnType<typeof streamStoryScript>>,
): Promise<Story> {
  if (!script.panels.length) {
    throw new Error('Story generation failed: no panels returned.');
  }

  const lastPanelIndex = script.panels.length - 1;
  const [firstImage, lastImage] = await Promise.all([
    generatePanelImage(
      accessToken,
      script.panels[0].imagePrompt,
      script.characterDescription,
      profileForApi.art_style,
    ),
    generatePanelImage(
      accessToken,
      script.panels[lastPanelIndex].imagePrompt,
      script.characterDescription,
      profileForApi.art_style,
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
}

async function persistPreviewStory(
  accessToken: string,
  profileForApi: PendingGeneration['profileForApi'],
  previewStory: Story,
): Promise<number> {
  const previewPanels = await Promise.all(
    previewStory.panels.map(async (panel, index) => ({
      panel_order: index,
      text: panel.text,
      image_prompt: panel.imagePrompt,
      image_base64: panel.imageUrl ? await imageSourceToPureBase64(panel.imageUrl) : undefined,
    })),
  );

  return saveStory(accessToken, {
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
}

export async function generatePreviewState(
  accessToken: string,
  profile: KidProfile,
  onIntroDelta: (field: StoryIntroField, delta: string) => void,
): Promise<GeneratedPreviewState> {
  const profileForApi = mapKidProfileToGenerationProfile(profile);
  const script = await streamStoryScript(accessToken, profileForApi, { onIntroDelta });
  const previewStory = await buildPreviewStory(accessToken, profileForApi, script);
  const previewStoryId = await persistPreviewStory(accessToken, profileForApi, previewStory);

  return {
    nextPendingGeneration: {
      profileForApi,
      previewStory,
      previewStoryId,
    },
  };
}

export async function generateFullStoryState(accessToken: string, pendingGeneration: PendingGeneration): Promise<Story> {
  const { previewStory, previewStoryId, profileForApi } = pendingGeneration;
  const lastPanelIndex = previewStory.panels.length - 1;

  const coverImagePromise = generatePanelImage(
    accessToken,
    previewStory.coverImagePrompt,
    previewStory.characterDescription,
    profileForApi.art_style,
  );
  const panelImagePromises = previewStory.panels.map(async (panel, index) => {
    if (index === 0 || index === lastPanelIndex) {
      if (!panel.imageUrl) {
        throw new Error('Preview images are missing. Please regenerate the preview.');
      }

      return imageSourceToPureBase64(panel.imageUrl);
    }

    const generatedImage = await generatePanelImage(
      accessToken,
      panel.imagePrompt,
      previewStory.characterDescription,
      profileForApi.art_style,
    );

    return imageSourceToPureBase64(generatedImage);
  });

  const [coverImage, panelImageBase64List] = await Promise.all([
    coverImagePromise,
    Promise.all(panelImagePromises),
  ]);

  await updateStory(accessToken, previewStoryId, {
    is_unlocked: true,
    cover_image_base64: await imageSourceToPureBase64(coverImage),
    panels: previewStory.panels.map((panel, index) => ({
      panel_order: index,
      text: panel.text,
      image_prompt: panel.imagePrompt,
      image_base64: panelImageBase64List[index],
    })),
  });

  return mapApiStoryToStory(await getStory(accessToken, previewStoryId));
}
