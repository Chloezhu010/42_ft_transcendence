import { useState } from 'react';
import {
  generatePanelImage,
  generateStoryScript,
  getStory,
  KidProfileForGeneration,
  saveStory,
  updatePanelImage,
  StoryDetailResponse,
} from '../services/backendApi';
import { KidProfile, Story, ComicPanelData } from '../types';

function mapApiStory(data: StoryDetailResponse): Story {
  return {
    title: data.title || '',
    foreword: data.foreword || '',
    characterDescription: data.character_description || '',
    coverImagePrompt: data.cover_image_prompt || '',
    coverImageUrl: data.cover_image_url || undefined,
    panels: data.panels.map(p => ({
      id: String(p.id),
      text: p.text,
      imagePrompt: p.image_prompt || '',
      imageUrl: p.image_url || undefined,
      isGenerating: false,
    })),
  };
}

function mapProfileToApi(p: KidProfile): KidProfileForGeneration {
  return {
    name: p.name,
    gender: p.gender,
    skin_tone: p.skinTone,
    hair_color: p.hairColor,
    eye_color: p.eyeColor,
    favorite_color: p.favoriteColor,
    dream: p.dream,
    archetype: p.archetype,
    art_style: p.artStyle,
    photo_base64: p.photoUrl?.startsWith('data:')
      ? p.photoUrl.split(',')[1]
      : undefined,
  };
}

interface PendingGeneration {
  profileForApi: KidProfileForGeneration;
  previewStory: Story;
}

export const useStoryGenerator = () => {
  const [story, setStory] = useState<Story | null>(null);
  const [savedStoryId, setSavedStoryId] = useState<number | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<PendingGeneration | null>(null);

  const generateStoryPreview = async (p: KidProfile) => {
    const profileForApi = mapProfileToApi(p);
    const script = await generateStoryScript(profileForApi);

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

    const previewStory: Story = {
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

    setSavedStoryId(null);
    setPendingGeneration({ profileForApi, previewStory });
    setStory(previewStory);
  };

  const generateFullStoryFromPreview = async () => {
    if (!pendingGeneration) {
      throw new Error('No preview is available. Please generate a preview first.');
    }

    const { profileForApi, previewStory } = pendingGeneration;
    const lastPanelIndex = previewStory.panels.length - 1;

    const coverImagePromise = generatePanelImage(
      previewStory.coverImagePrompt,
      previewStory.characterDescription,
      profileForApi.art_style
    );
    const panelImagePromises = previewStory.panels.map((panel, index) => {
      if (index === 0 || index === lastPanelIndex) {
        if (!panel.imageUrl) {
          throw new Error('Preview images are missing. Please regenerate the preview.');
        }
        return Promise.resolve(panel.imageUrl);
      }
      return generatePanelImage(
        panel.imagePrompt,
        previewStory.characterDescription,
        profileForApi.art_style
      );
    });

    const [coverImage, panelImages] = await Promise.all([
      coverImagePromise,
      Promise.all(panelImagePromises),
    ]);

    const storyId = await saveStory({
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
      cover_image_base64: coverImage,
      panels: previewStory.panels.map((panel, index) => ({
        panel_order: index,
        text: panel.text,
        image_prompt: panel.imagePrompt,
        image_base64: panelImages[index],
      })),
    });

    const savedStory = await getStory(storyId);
    setSavedStoryId(storyId);
    setStory(mapApiStory(savedStory));
    setPendingGeneration(null);
  };

  const updatePanel = async (updated: ComicPanelData) => {
    if (!story) return;

    const panelOrder = story.panels.findIndex(p => p.id === updated.id);

    setStory({
      ...story,
      panels: story.panels.map(p => p.id === updated.id ? updated : p)
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
        console.log(`Panel ${panelOrder} saved to backend`);
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
    generateStoryPreview,
    generateFullStoryFromPreview,
    hasPendingPreview: Boolean(pendingGeneration),
    updatePanel,
  };
};
