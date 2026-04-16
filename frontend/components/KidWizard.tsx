/**
 * Controlled onboarding wizard UI for editing a kid profile.
 * The page owns the data; this component only renders steps and emits user intent.
 */
import type { ChangeEvent } from 'react';
import type { KidProfile } from '@/types';
import { SketchyButton } from '@/components/design-system/Primitives';
import { Heading, Label } from '@/components/design-system/Typography';
import { SketchyInput, SketchyTextarea } from '@/components/design-system/Forms';
import {
  ARCHETYPES,
  ART_STYLES,
  EYE_COLORS,
  FAVORITE_COLORS,
  GENDERS,
  GENDER_BUTTON_STYLE,
  HAIR_COLORS,
  SKIN_TONES,
  STEP_LABELS,
  type ColorOption,
  type WizardStepDefinition,
} from './kidWizard.constants';

type WizardStepState = 'complete' | 'active' | 'upcoming';
type UpdateProfileField = <Key extends keyof KidProfile>(field: Key, value: KidProfile[Key]) => void;

interface KidWizardProps {
  step: number;
  profile: KidProfile;
  onProfileChange: (nextProfile: KidProfile) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onPhotoSelect: (file: File) => Promise<void>;
  onPhotoRemove: () => void;
  onSubmit: () => Promise<void>;
}

interface ColorGridProps {
  options: ColorOption[];
  selected: string;
  onSelect: (value: string) => void;
  label: string;
}

interface WizardProgressProps {
  currentStep: number;
  steps: WizardStepDefinition[];
}

interface HeroStepSectionProps {
  profile: KidProfile;
  onUpdateProfileField: UpdateProfileField;
}

interface AppearanceStepSectionProps {
  profile: KidProfile;
  photoPreview: string | null;
  onUpdateProfileField: UpdateProfileField;
  onPhotoSelect: (file: File) => Promise<void>;
  onPhotoRemove: () => void;
}

interface ArchetypeStepSectionProps {
  profile: KidProfile;
  onUpdateProfileField: UpdateProfileField;
}

interface DreamStepSectionProps {
  profile: KidProfile;
  onUpdateProfileField: UpdateProfileField;
}

interface StyleStepSectionProps {
  profile: KidProfile;
  onUpdateProfileField: UpdateProfileField;
}

interface WizardFooterProps {
  step: number;
  totalSteps: number;
  onPreviousStep: () => void;
  onContinue: () => void;
}

function getWizardStepState(stepNumber: number, currentStep: number): WizardStepState {
  if (stepNumber === currentStep) {
    return 'active';
  }

  if (stepNumber < currentStep) {
    return 'complete';
  }

  return 'upcoming';
}

function getWizardStepContainerClassName(stepState: WizardStepState): string {
  if (stepState === 'active') {
    return 'flex flex-col items-center transition-all duration-300 scale-110';
  }

  if (stepState === 'complete') {
    return 'flex flex-col items-center transition-all duration-300 opacity-70';
  }

  return 'flex flex-col items-center transition-all duration-300 opacity-40';
}

function getWizardStepBadgeClassName(stepState: WizardStepState): string {
  if (stepState === 'active') {
    return 'w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 transition-all duration-300 bg-purple-600 text-white shadow-lg ring-4 ring-purple-200';
  }

  if (stepState === 'complete') {
    return 'w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 transition-all duration-300 bg-yellow-400 text-purple-900';
  }

  return 'w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 transition-all duration-300 bg-gray-100 text-gray-400';
}

function getWizardStepLabelClassName(stepState: WizardStepState): string {
  if (stepState === 'active') {
    return 'text-xs font-bold uppercase tracking-wide transition-colors text-purple-600';
  }

  if (stepState === 'complete') {
    return 'text-xs font-bold uppercase tracking-wide transition-colors text-yellow-600';
  }

  return 'text-xs font-bold uppercase tracking-wide transition-colors text-gray-400';
}

function getSelectionCardClassName(isSelected: boolean, textAlignmentClassName: string): string {
  const selectedStateClassName = isSelected
    ? 'border-brand-primary bg-brand-light shadow-soft'
    : 'border-brand-primary/10 bg-white hover:border-brand-primary/30';

  return `p-6 rounded-3xl border-4 transition-all hover:-translate-y-1 ${textAlignmentClassName} ${selectedStateClassName}`;
}

function ColorGrid({ options, selected, onSelect, label }: ColorGridProps): JSX.Element {
  return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 px-4">
      <Label className="block mb-6 text-brand-primary text-sm">{label}</Label>
      <div className="flex flex-wrap gap-6">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onSelect(option.label)}
            className={`group relative w-12 h-12 rounded-full border-4 transition-all duration-300 ${
              selected === option.label
                ? 'border-brand-primary scale-125 z-10 shadow-soft'
                : 'border-gray-100 hover:scale-110'
            }`}
            style={{ backgroundColor: option.hex }}
            title={option.label}
          >
            {selected === option.label && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
              </div>
            )}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-brand-dark opacity-0 group-hover:opacity-100 transition-opacity uppercase whitespace-nowrap">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WizardProgress({ currentStep, steps }: WizardProgressProps): JSX.Element {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        {steps.map(({ step, label, icon }) => {
          const stepState = getWizardStepState(step, currentStep);
          const stepIcon = stepState === 'complete' ? '✓' : icon;

          return (
            <div key={step} className={getWizardStepContainerClassName(stepState)}>
              <div className={getWizardStepBadgeClassName(stepState)}>
                {stepIcon}
              </div>
              <span className={getWizardStepLabelClassName(stepState)}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroStepSection({
  profile,
  onUpdateProfileField,
}: HeroStepSectionProps): JSX.Element {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col justify-center">
      <Heading className="mb-8 text-brand-dark">Who is the Hero?</Heading>
      <SketchyInput
        autoFocus
        placeholder="Hero's name..."
        value={profile.name}
        onChange={(event) => onUpdateProfileField('name', event.target.value)}
        className="mb-8"
      />
      <div className="flex gap-4">
        {GENDERS.map((gender) => (
          <SketchyButton
            key={gender}
            variant={profile.gender === gender ? 'primary' : 'outline'}
            onClick={() => onUpdateProfileField('gender', gender)}
            className="flex-1 py-4 capitalize text-xl rounded-2xl"
            style={GENDER_BUTTON_STYLE}
          >
            {gender}
          </SketchyButton>
        ))}
      </div>
    </div>
  );
}

function AppearanceStepSection({
  profile,
  photoPreview,
  onUpdateProfileField,
  onPhotoSelect,
  onPhotoRemove,
}: AppearanceStepSectionProps): JSX.Element {
  const handlePhotoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void onPhotoSelect(file);
  };

  return (
    <div className="animate-in fade-in duration-500 flex-1 overflow-y-auto">
      <Heading className="mb-10 text-brand-dark">Appearance</Heading>
      <ColorGrid
        label="Skin Tone"
        options={SKIN_TONES}
        selected={profile.skinTone}
        onSelect={(value) => onUpdateProfileField('skinTone', value)}
      />
      <ColorGrid
        label="Hair Color"
        options={HAIR_COLORS}
        selected={profile.hairColor}
        onSelect={(value) => onUpdateProfileField('hairColor', value)}
      />
      <ColorGrid
        label="Eye Color"
        options={EYE_COLORS}
        selected={profile.eyeColor}
        onSelect={(value) => onUpdateProfileField('eyeColor', value)}
      />

      <div className="mb-8 mt-10 pt-8 border-t border-brand-light px-4">
        <Label className="block mb-6 text-brand-primary text-sm">Photo (Optional)</Label>
        <div className="flex gap-4">
          <label className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl border-4 border-dashed border-brand-primary/20 cursor-pointer hover:border-brand-primary transition-colors bg-brand-light/30 hover:bg-brand-light">
            <span className="text-4xl mb-2">📸</span>
            <span className="text-sm font-semibold text-brand-primary uppercase">Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoInputChange}
            />
          </label>

          {photoPreview && (
            <div className="flex-1 relative rounded-3xl overflow-hidden border-4 border-brand-accent">
              <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover" />
              <button
                type="button"
                onClick={onPhotoRemove}
                className="absolute top-2 right-2 bg-red-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-lg hover:bg-red-500 border border-white shadow-sm"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchetypeStepSection({
  profile,
  onUpdateProfileField,
}: ArchetypeStepSectionProps): JSX.Element {
  return (
    <div className="animate-in fade-in duration-500 flex-1">
      <Heading className="mb-8 text-brand-dark">Role & Archetype</Heading>
      <div className="grid grid-cols-2 gap-4">
        {ARCHETYPES.map((archetype) => {
          const isSelected = profile.archetype === archetype.label;
          const iconColor = isSelected ? '#9D6BCF' : '#7D6391';

          return (
            <button
              key={archetype.id}
              type="button"
              onClick={() => onUpdateProfileField('archetype', archetype.label)}
              className={getSelectionCardClassName(isSelected, 'text-left')}
            >
              <div className="mb-2">
                <archetype.Icon className="w-10 h-10" color={iconColor} />
              </div>
              <div className="font-semibold text-lg text-brand-primary">{archetype.label}</div>
              <div className="text-xs text-brand-muted font-semibold">{archetype.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DreamStepSection({
  profile,
  onUpdateProfileField,
}: DreamStepSectionProps): JSX.Element {
  return (
    <div className="animate-in fade-in duration-500 flex-1 flex flex-col justify-center">
      <Heading className="mb-6 text-brand-dark">The Grand Dream</Heading>
      <SketchyTextarea
        autoFocus
        placeholder="e.g. To explore a planet made of candy..."
        value={profile.dream}
        onChange={(event) => onUpdateProfileField('dream', event.target.value)}
        className="min-h-[120px]"
      />
    </div>
  );
}

function StyleStepSection({
  profile,
  onUpdateProfileField,
}: StyleStepSectionProps): JSX.Element {
  return (
    <div className="animate-in fade-in duration-500 flex-1">
      <Heading className="mb-10 text-brand-dark">Your Style & Palette</Heading>

      <div className="mb-12">
        <Label className="block mb-6 text-brand-primary text-sm">Art Style</Label>
        <div className="grid grid-cols-2 gap-4">
          {ART_STYLES.map((style) => {
            const isSelected = profile.artStyle === style.label;

            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onUpdateProfileField('artStyle', style.label)}
                className={getSelectionCardClassName(isSelected, 'text-center')}
              >
                <div className="text-4xl mb-2">{style.icon}</div>
                <div className="font-semibold text-lg text-brand-primary">{style.label}</div>
                <div className="text-xs text-brand-muted font-semibold">{style.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-brand-light pt-10">
        <Label className="block mb-6 text-brand-primary text-sm">Favorite Color</Label>
        <ColorGrid
          label=""
          options={FAVORITE_COLORS}
          selected={profile.favoriteColor}
          onSelect={(value) => onUpdateProfileField('favoriteColor', value)}
        />
      </div>
    </div>
  );
}

function WizardFooter({
  step,
  totalSteps,
  onPreviousStep,
  onContinue,
}: WizardFooterProps): JSX.Element {
  const isLastStep = step === totalSteps;

  return (
    <div className="flex justify-between items-center mt-auto pt-8 border-t border-purple-50">
      {step > 1 ? (
        <button
          type="button"
          onClick={onPreviousStep}
          className="flex items-center gap-2 px-6 py-3 font-black text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-xl uppercase tracking-widest text-sm transition-all"
        >
          <span className="text-lg">←</span> Back
        </button>
      ) : <div className="w-24" />}

      <button
        type="button"
        onClick={onContinue}
        className="flex items-center gap-2 px-8 py-4 font-black rounded-2xl shadow-lg transition-all bg-yellow-400 text-purple-900 hover:-translate-y-1 hover:shadow-xl"
      >
        {isLastStep ? <>Create My Story ✨</> : <>Continue <span className="text-lg">→</span></>}
      </button>
    </div>
  );
}

function KidWizard({
  step,
  profile,
  onProfileChange,
  onNextStep,
  onPreviousStep,
  onPhotoSelect,
  onPhotoRemove,
  onSubmit,
}: KidWizardProps): JSX.Element {
  function renderCurrentStepContent(): JSX.Element | null {
    switch (step) {
      case 1:
        return <HeroStepSection profile={profile} onUpdateProfileField={updateProfileField} />;
      case 2:
        return (
          <AppearanceStepSection
            profile={profile}
            photoPreview={photoPreview}
            onUpdateProfileField={updateProfileField}
            onPhotoSelect={onPhotoSelect}
            onPhotoRemove={onPhotoRemove}
          />
        );
      case 3:
        return <ArchetypeStepSection profile={profile} onUpdateProfileField={updateProfileField} />;
      case 4:
        return <DreamStepSection profile={profile} onUpdateProfileField={updateProfileField} />;
      case 5:
        return <StyleStepSection profile={profile} onUpdateProfileField={updateProfileField} />;
      default:
        return null;
    }
  }

  const totalSteps = STEP_LABELS.length;
  const progressWidth = `${(step / totalSteps) * 100}%`;
  const photoPreview = profile.photoUrl || null;

  const updateProfileField: UpdateProfileField = (field, value) => {
    onProfileChange({
      ...profile,
      [field]: value,
    });
  };

  const handleContinue = () => {
    if (step < totalSteps) {
      onNextStep();
      return;
    }

    void onSubmit();
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="mb-4">
        <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: progressWidth }} />
        </div>
      </div>

      <WizardProgress currentStep={step} steps={STEP_LABELS} />

      <div className="bg-white rounded-[2rem] shadow-xl border-2 border-purple-900/5 p-8 md:p-12 min-h-[500px] flex flex-col">
        {renderCurrentStepContent()}

        <WizardFooter
          step={step}
          totalSteps={totalSteps}
          onPreviousStep={onPreviousStep}
          onContinue={handleContinue}
        />
      </div>
    </div>
  );
}

export default KidWizard;
