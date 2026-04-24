import { useSpeechSynthesis } from '@/components/speech/useSpeechSynthesis';

interface StoryReadAloudControlProps {
  text: string;
  className?: string;
}

function getPrimaryControlLabel(isSpeaking: boolean, isPaused: boolean): string {
  if (isPaused) {
    return 'Resume story audio';
  }

  if (isSpeaking) {
    return 'Pause story audio';
  }

  return 'Read story aloud';
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
  const speech = useSpeechSynthesis();

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

  const label = getPrimaryControlLabel(speech.isSpeaking, speech.isPaused);
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
          aria-label="Stop story audio"
          title="Stop story audio"
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
