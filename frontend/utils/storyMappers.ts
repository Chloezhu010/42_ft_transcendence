/**
 * Pure mappers between backend DTOs and frontend story models.
 */
import type { KidProfile, Story } from '@/types';
import type { KidProfileForGeneration, KidProfileResponse, StoryDetailResponse } from '@client-api';

export function mapApiStoryToStory(data: StoryDetailResponse): Story {
  return {
    title: data.title || '',
    foreword: data.foreword || '',
    characterDescription: data.character_description || '',
    coverImagePrompt: data.cover_image_prompt || '',
    coverImageUrl: data.cover_image_url || undefined,
    panels: data.panels.map((panel, index) => ({
      id: panel.id ? String(panel.id) : String(index + 1),
      text: panel.text,
      imagePrompt: panel.image_prompt || '',
      imageUrl: panel.image_url || undefined,
      isGenerating: false,
    })),
  };
}

export function mapApiProfileToKidProfile(profile: KidProfileResponse): KidProfile {
  return {
    name: profile.name,
    gender: profile.gender,
    skinTone: profile.skin_tone,
    hairColor: profile.hair_color,
    eyeColor: profile.eye_color,
    favoriteColor: profile.favorite_color,
    dream: profile.dream || '',
    archetype: profile.archetype || undefined,
    artStyle: profile.art_style || undefined,
  };
}

export function mapKidProfileToGenerationProfile(profile: KidProfile): KidProfileForGeneration {
  return {
    name: profile.name,
    gender: profile.gender,
    skin_tone: profile.skinTone,
    hair_color: profile.hairColor,
    eye_color: profile.eyeColor,
    favorite_color: profile.favoriteColor,
    dream: profile.dream,
    archetype: profile.archetype,
    art_style: profile.artStyle,
    photo_base64: profile.photoUrl?.startsWith('data:')
      ? profile.photoUrl.split(',')[1]
      : undefined,
  };
}
