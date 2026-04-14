import { Icons } from '@/components/design-system/Icons';
import type { KidProfile } from '@/types';

export interface ColorOption {
  label: string;
  hex: string;
}

export interface WizardStepDefinition {
  step: number;
  label: string;
  icon: string;
}

export interface ArchetypeOption {
  id: string;
  label: string;
  Icon: typeof Icons.Explorer;
  description: string;
}

export type GenderOption = KidProfile['gender'];

export const ARCHETYPES: ArchetypeOption[] = [
  { id: 'explorer', label: 'Brave Explorer', Icon: Icons.Explorer, description: 'Seeking adventure.' },
  { id: 'inventor', label: 'Inventor', Icon: Icons.Inventor, description: 'Solves problems.' },
  { id: 'guardian', label: 'Guardian', Icon: Icons.Guardian, description: 'Protects others.' },
  { id: 'dreamer', label: 'Dreamer', Icon: Icons.Dreamer, description: 'Makes magic real.' },
];

export const SKIN_TONES: ColorOption[] = [
  { label: 'Fair', hex: '#FBD3B6' },
  { label: 'Beige', hex: '#F3C5A2' },
  { label: 'Honey', hex: '#EAB676' },
  { label: 'Almond', hex: '#A67344' },
  { label: 'Bronze', hex: '#825832' },
  { label: 'Deep', hex: '#633924' },
];

export const HAIR_COLORS: ColorOption[] = [
  { label: 'Blonde', hex: '#F9E395' },
  { label: 'Golden', hex: '#D4AF37' },
  { label: 'Brown', hex: '#634439' },
  { label: 'Ginger', hex: '#C05C21' },
  { label: 'Red', hex: '#A52A2A' },
  { label: 'Black', hex: '#1C1C1C' },
  { label: 'Grey', hex: '#8E8E8E' },
];

export const EYE_COLORS: ColorOption[] = [
  { label: 'Blue', hex: '#4682B4' },
  { label: 'Green', hex: '#2E8B57' },
  { label: 'Brown', hex: '#8B4513' },
  { label: 'Hazel', hex: '#808000' },
  { label: 'Amber', hex: '#FFBF00' },
  { label: 'Grey', hex: '#708090' },
];

export const FAVORITE_COLORS: ColorOption[] = [
  { label: 'Red', hex: '#EF4444' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Yellow', hex: '#FACC15' },
  { label: 'Green', hex: '#22C55E' },
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Purple', hex: '#A855F7' },
  { label: 'Pink', hex: '#EC4899' },
  { label: 'Cyan', hex: '#06B6D4' },
];

export const ART_STYLES = [
  { id: 'classic', label: 'Classic Comic', icon: '🎨', description: 'Bold lines, vibrant colors' },
  { id: 'watercolor', label: 'Watercolor', icon: '🌊', description: 'Soft, dreamy aesthetic' },
  { id: 'pencil', label: 'Pencil Sketch', icon: '✏️', description: 'Hand-drawn charm' },
  { id: 'digital', label: 'Digital Pop', icon: '✨', description: 'Modern and bold' },
] as const;

export const STEP_LABELS: WizardStepDefinition[] = [
  { step: 1, label: 'Hero', icon: '🦸' },
  { step: 2, label: 'Look', icon: '👤' },
  { step: 3, label: 'Role', icon: '🎭' },
  { step: 4, label: 'Dream', icon: '💭' },
  { step: 5, label: 'Style', icon: '🎨' },
];

export const GENDERS: GenderOption[] = ['boy', 'girl', 'neutral'];

export const GENDER_BUTTON_STYLE = { borderRadius: '16px' };
