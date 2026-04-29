/**
 * Pure helpers for story-page parsing, state shaping, and small browser utilities.
 */
import type { ComicPanelData, KidProfile, Story } from '@/types';
import type { IntroStreamState } from './story.types';

export const INTRO_MIN_HOLD_MS = 600;

export const INITIAL_INTRO_STREAM_STATE: IntroStreamState = {
  title: '',
  foreword: '',
  isStreaming: false,
  isPreparingPreview: false,
};

export function createEmptyKidProfile(): KidProfile {
  return {
    name: '',
    gender: 'boy',
    skinTone: 'Fair',
    hairColor: 'Brown',
    eyeColor: 'Blue',
    favoriteColor: 'Purple',
    dream: '',
    archetype: 'Brave Explorer',
    language: undefined,
    photoUrl: '',
    artStyle: 'Classic Comic',
  };
}

export function parseStoryId(rawStoryId: string | undefined): number | null {
  if (!rawStoryId) {
    return null;
  }

  const storyId = Number(rawStoryId);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return null;
  }

  return storyId;
}

export function appendIntroDelta(
  previousState: IntroStreamState,
  field: 'title' | 'foreword',
  delta: string,
): IntroStreamState {
  return {
    ...previousState,
    [field]: previousState[field] + delta,
  };
}

export function isPreviewDraft(story: Story): boolean {
  const hasMissingPanelImage = story.panels.some((panel) => !panel.imageUrl);
  return !story.coverImageUrl || hasMissingPanelImage;
}

export function replaceStoryPanel(story: Story, updatedPanel: ComicPanelData): Story {
  return {
    ...story,
    panels: story.panels.map((panel) => (
      panel.id === updatedPanel.id ? updatedPanel : panel
    )),
  };
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read photo.'));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read photo.'));
    };

    reader.readAsDataURL(file);
  });
}
