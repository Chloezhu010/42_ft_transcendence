/**
 * Shared types for the story page view state and generation lifecycle.
 */
import type { KidProfileForGeneration } from '@client-api';
import type { Story } from '@/types';

export enum StoryPageView {
  Onboarding = 'onboarding',
  StreamingIntro = 'streaming-intro',
  GeneratingStory = 'generating-story',
  Preview = 'preview',
  Storyboard = 'storyboard',
}

export interface IntroStreamState {
  title: string;
  foreword: string;
  isStreaming: boolean;
  isPreparingPreview: boolean;
}

export interface PendingGeneration {
  profileForApi: KidProfileForGeneration;
  previewStory: Story;
  previewStoryId: number;
}
