import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KidProfile } from '../types';
import { SketchyButton } from './design-system/Primitives';
import { Icons } from './design-system/Icons';
import { Heading, Label } from './design-system/Typography';
import { SketchyInput, SketchyTextarea } from './design-system/Forms';

interface Props {
  onSubmit: (profile: KidProfile) => void;
}

interface ColorOption {
  label: string;
  hex: string;
}

type GenderOption = KidProfile['gender'];

const ARCHETYPES = [
  { id: 'explorer', label: 'Brave Explorer', Icon: Icons.Explorer, description: 'Seeking adventure.' },
  { id: 'inventor', label: 'Inventor', Icon: Icons.Inventor, description: 'Solves problems.' },
  { id: 'guardian', label: 'Guardian', Icon: Icons.Guardian, description: 'Protects others.' },
  { id: 'dreamer', label: 'Dreamer', Icon: Icons.Dreamer, description: 'Makes magic real.' },
];

const SKIN_TONES = [
  { label: 'Fair', hex: '#FBD3B6' },
  { label: 'Beige', hex: '#F3C5A2' },
  { label: 'Honey', hex: '#EAB676' },
  { label: 'Almond', hex: '#A67344' },
  { label: 'Bronze', hex: '#825832' },
  { label: 'Deep', hex: '#633924' },
];

const HAIR_COLORS = [
  { label: 'Blonde', hex: '#F9E395' },
  { label: 'Golden', hex: '#D4AF37' },
  { label: 'Brown', hex: '#634439' },
  { label: 'Ginger', hex: '#C05C21' },
  { label: 'Red', hex: '#A52A2A' },
  { label: 'Black', hex: '#1C1C1C' },
  { label: 'Grey', hex: '#8E8E8E' },
];

const EYE_COLORS = [
  { label: 'Blue', hex: '#4682B4' },
  { label: 'Green', hex: '#2E8B57' },
  { label: 'Brown', hex: '#8B4513' },
  { label: 'Hazel', hex: '#808000' },
  { label: 'Amber', hex: '#FFBF00' },
  { label: 'Grey', hex: '#708090' },
];

const FAVORITE_COLORS = [
  { label: 'Red', hex: '#EF4444' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Yellow', hex: '#FACC15' },
  { label: 'Green', hex: '#22C55E' },
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Purple', hex: '#A855F7' },
  { label: 'Pink', hex: '#EC4899' },
  { label: 'Cyan', hex: '#06B6D4' },
];

const ART_STYLES = [
  { id: 'classic', label: 'Classic Comic', icon: '🎨', description: 'Bold lines, vibrant colors' },
  { id: 'watercolor', label: 'Watercolor', icon: '🌊', description: 'Soft, dreamy aesthetic' },
  { id: 'pencil', label: 'Pencil Sketch', icon: '✏️', description: 'Hand-drawn charm' },
  { id: 'digital', label: 'Digital Pop', icon: '✨', description: 'Modern and bold' },
];

const STEP_LABELS = [
  { step: 1, label: 'Hero', icon: '🦸' },
  { step: 2, label: 'Look', icon: '👤' },
  { step: 3, label: 'Role', icon: '🎭' },
  { step: 4, label: 'Dream', icon: '💭' },
  { step: 5, label: 'Style', icon: '🎨' },
];

const GENDERS: GenderOption[] = ['boy', 'girl', 'neutral'];

interface ColorGridProps {
  options: ColorOption[];
  selected: string;
  onSelect: (value: string) => void;
  label: string;
}

const ColorGrid: React.FC<ColorGridProps> = ({ options, selected, onSelect, label }) => (
  <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 px-4">
    <Label className="block mb-6 text-brand-primary text-sm">{label}</Label>
    <div className="flex flex-wrap gap-6">
      {options.map(opt => (
        <button
          key={opt.label}
          onClick={() => onSelect(opt.label)}
          className={`group relative w-12 h-12 rounded-full border-4 transition-all duration-300 ${selected === opt.label ? 'border-brand-primary scale-125 z-10 shadow-soft' : 'border-gray-100 hover:scale-110'}`}
          style={{ backgroundColor: opt.hex }}
          title={opt.label}
        >
          {selected === opt.label && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
            </div>
          )}
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-brand-dark opacity-0 group-hover:opacity-100 transition-opacity uppercase whitespace-nowrap">{opt.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const KidWizard: React.FC<Props> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<KidProfile>({
    name: '',
    gender: 'boy',
    skinTone: 'Fair',
    hairColor: 'Brown',
    eyeColor: 'Blue',
    favoriteColor: 'Purple',
    dream: '',
    archetype: 'Brave Explorer',
    photoUrl: '',
    artStyle: 'Classic Comic',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const totalSteps = STEP_LABELS.length;
  const progressWidth = `${(step / totalSteps) * 100}%`;

  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: progressWidth }} />
        </div>
      </div>

      {/* Step indicators */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          {STEP_LABELS.map(({ step: s, label, icon }) => (
            <div
              key={s}
              className={`flex flex-col items-center transition-all duration-300 ${
                s === step
                  ? 'scale-110'
                  : s < step
                    ? 'opacity-70'
                    : 'opacity-40'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 transition-all duration-300 ${
                s === step
                  ? 'bg-purple-600 text-white shadow-lg ring-4 ring-purple-200'
                  : s < step
                    ? 'bg-yellow-400 text-purple-900'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {s < step ? '✓' : icon}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wide transition-colors ${
                s === step
                  ? 'text-purple-600'
                  : s < step
                    ? 'text-yellow-600'
                    : 'text-gray-400'
              }`}>
                {t(`kidWizard.steps.${label.toLowerCase()}`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border-2 border-purple-900/5 p-8 md:p-12 min-h-[500px] flex flex-col">

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col justify-center">
            <Heading className="mb-8 text-brand-dark">{t('kidWizard.heroQuestion')}</Heading>
            <SketchyInput
              autoFocus
              placeholder={t('kidWizard.heroNamePlaceholder')}
              value={profile.name}
              onChange={e => setProfile(previous => ({ ...previous, name: e.target.value }))}
              className="mb-8"
            />
            <div className="flex gap-4">
              {GENDERS.map(gender => (
                <SketchyButton
                  key={gender}
                  variant={profile.gender === gender ? 'primary' : 'outline'}
                  onClick={() => setProfile(previous => ({ ...previous, gender }))}
                  className="flex-1 py-4 capitalize text-xl rounded-2xl"
                  style={{ borderRadius: '16px' }}
                >
                  {t(`kidWizard.genders.${gender}`)}
                </SketchyButton>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in duration-500 flex-1 overflow-y-auto">
            <Heading className="mb-10 text-brand-dark">{t('kidWizard.appearance')}</Heading>
            <ColorGrid label={t('kidWizard.skinTone')} options={SKIN_TONES} selected={profile.skinTone} onSelect={value => setProfile(previous => ({ ...previous, skinTone: value }))} />
            <ColorGrid label={t('kidWizard.hairColor')} options={HAIR_COLORS} selected={profile.hairColor} onSelect={value => setProfile(previous => ({ ...previous, hairColor: value }))} />
            <ColorGrid label={t('kidWizard.eyeColor')} options={EYE_COLORS} selected={profile.eyeColor} onSelect={value => setProfile(previous => ({ ...previous, eyeColor: value }))} />

            <div className="mb-8 mt-10 pt-8 border-t border-brand-light px-4">
              <Label className="block mb-6 text-brand-primary text-sm">{t('kidWizard.photoOptional')}</Label>
              <div className="flex gap-4">
                <label className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl border-4 border-dashed border-brand-primary/20 cursor-pointer hover:border-brand-primary transition-colors bg-brand-light/30 hover:bg-brand-light">
                  <span className="text-4xl mb-2">📸</span>
                  <span className="text-sm font-semibold text-brand-primary uppercase">{t('kidWizard.uploadPhoto')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const imageDataUrl = reader.result;
                          if (typeof imageDataUrl !== 'string') {
                            return;
                          }
                          setPhotoPreview(imageDataUrl);
                          setProfile(previous => ({ ...previous, photoUrl: imageDataUrl }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {photoPreview && (
                  <div className="flex-1 relative rounded-3xl overflow-hidden border-4 border-brand-accent">
                    <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setProfile(previous => ({ ...previous, photoUrl: '' }));
                      }}
                      className="absolute top-2 right-2 bg-red-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-lg hover:bg-red-500 border border-white shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in duration-500 flex-1">
            <Heading className="mb-8 text-brand-dark">{t('kidWizard.roleArchetype')}</Heading>
            <div className="grid grid-cols-2 gap-4">
              {ARCHETYPES.map(arc => (
                <button
                  key={arc.id}
                  onClick={() => setProfile(previous => ({ ...previous, archetype: arc.label }))}
                  className={`p-6 rounded-3xl border-4 text-left transition-all hover:-translate-y-1 ${profile.archetype === arc.label ? 'border-brand-primary bg-brand-light shadow-soft' : 'border-brand-primary/10 bg-white hover:border-brand-primary/30'}`}
                >
                  <div className="mb-2">
                    <arc.Icon
                      className="w-10 h-10"
                      color={profile.archetype === arc.label ? '#9D6BCF' : '#7D6391'}
                    />
                  </div>
                  <div className="font-semibold text-lg text-brand-primary">{t(`kidWizard.archetypes.${arc.id}.label`)}</div>
                  <div className="text-xs text-brand-muted font-semibold">{t(`kidWizard.archetypes.${arc.id}.description`)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in duration-500 flex-1 flex flex-col justify-center">
            <Heading className="mb-6 text-brand-dark">{t('kidWizard.grandDream')}</Heading>
            <SketchyTextarea
              autoFocus
              placeholder={t('kidWizard.dreamPlaceholder')}
              value={profile.dream}
              onChange={e => setProfile(previous => ({ ...previous, dream: e.target.value }))}
              className="min-h-[120px]"
            />
          </div>
        )}

        {step === 5 && (
          <div className="animate-in fade-in duration-500 flex-1">
            <Heading className="mb-10 text-brand-dark">{t('kidWizard.stylePalette')}</Heading>

            <div className="mb-12">
              <Label className="block mb-6 text-brand-primary text-sm">{t('kidWizard.artStyle')}</Label>
              <div className="grid grid-cols-2 gap-4">
                {ART_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setProfile(previous => ({ ...previous, artStyle: style.label }))}
                    className={`p-6 rounded-3xl border-4 text-center transition-all hover:-translate-y-1 ${profile.artStyle === style.label ? 'border-brand-primary bg-brand-light shadow-soft' : 'border-brand-primary/10 bg-white hover:border-brand-primary/30'}`}
                  >
                    <div className="text-4xl mb-2">{style.icon}</div>
                    <div className="font-semibold text-lg text-brand-primary">{t(`kidWizard.artStyles.${style.id}.label`)}</div>
                    <div className="text-xs text-brand-muted font-semibold">{t(`kidWizard.artStyles.${style.id}.description`)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-brand-light pt-10">
              <Label className="block mb-6 text-brand-primary text-sm">{t('kidWizard.favoriteColor')}</Label>
              <ColorGrid label="" options={FAVORITE_COLORS} selected={profile.favoriteColor} onSelect={value => setProfile(previous => ({ ...previous, favoriteColor: value }))} />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-auto pt-8 border-t border-purple-50">
          {/* Back button */}
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-6 py-3 font-black text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-xl uppercase tracking-widest text-sm transition-all"
            >
              <span className="text-lg">←</span> {t('kidWizard.back')}
            </button>
          ) : <div className="w-24" />}

          {/* Continue/Submit button */}
          <button
            onClick={() => step < totalSteps ? setStep(s => s + 1) : onSubmit(profile)}
            className="flex items-center gap-2 px-8 py-4 font-black rounded-2xl shadow-lg transition-all bg-yellow-400 text-purple-900 hover:-translate-y-1 hover:shadow-xl"
          >
            {step < totalSteps ? (
              <>{t('kidWizard.continue')} <span className="text-lg">→</span></>
            ) : (
              <>{t('kidWizard.createStory')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KidWizard;
