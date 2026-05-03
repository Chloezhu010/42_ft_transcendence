import { useSpeechSynthesis } from '@/components/speech/useSpeechSynthesis';
import { useTranslation } from 'react-i18next';

interface StoryReadAloudControlProps {
  text: string;
  className?: string;
}

function getPrimaryControlLabel(
  isSpeaking: boolean,
  isPaused: boolean,
  labels: {
    read: string;
    pause: string;
    resume: string;
  },
): string {
  if (isPaused) {
    return labels.resume;
  }

  if (isSpeaking) {
    return labels.pause;
  }

  return labels.read;
}

function getPrimaryControlIcon(isSpeaking: boolean, isPaused: boolean): string {
  if (isPaused) {
    return '▶';
  }

  if (isSpeaking) {
    return '⏸';
  }

  return '🔊';
}

function StoryReadAloudControl({
  text,
  className = '',
}: StoryReadAloudControlProps): JSX.Element {
  const { t } = useTranslation();
  const speech = useSpeechSynthesis({
    errorMessages: {
      unsupported: t('story.readAloud.errors.unsupported'),
      empty: t('story.readAloud.errors.empty'),
      playbackFailed: t('story.readAloud.errors.playbackFailed'),
    },
  });

  const handlePrimaryAction = () => {
    if (speech.isPaused) {
      speech.resume();
      return;
    }

    if (speech.isSpeaking) {
      speech.pause();
      return;
    }

    speech.speak(text);
  };

  const label = getPrimaryControlLabel(speech.isSpeaking, speech.isPaused, {
    read: t('story.readAloud.read'),
    pause: t('story.readAloud.pause'),
    resume: t('story.readAloud.resume'),
  });
  const icon = getPrimaryControlIcon(speech.isSpeaking, speech.isPaused);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={handlePrimaryAction}
        disabled={!speech.isSupported}
        className="w-10 h-10 rounded-full bg-white/90 border-2 border-brand-primary/20 shadow-soft text-brand-primary font-black hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {icon}
      </button>
      {speech.isSpeaking || speech.isPaused ? (
        <button
          type="button"
          aria-label={t('story.readAloud.stop')}
          title={t('story.readAloud.stop')}
          onClick={speech.stop}
          className="w-10 h-10 rounded-full bg-white/90 border-2 border-brand-primary/20 shadow-soft text-brand-primary font-black hover:bg-brand-light transition-colors"
        >
          ■
        </button>
      ) : null}
      {speech.error ? (
        <span className="max-w-[180px] text-[10px] font-bold text-red-500">
          {speech.error}
        </span>
      ) : null}
    </div>
  );
}

export default StoryReadAloudControl;
