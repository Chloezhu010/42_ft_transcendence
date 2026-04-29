import { useTranslation } from 'react-i18next';
import { Heading, Label, Text } from '@/components/design-system/Typography';

interface StoryIntroStreamProps {
  /** Title text that has streamed in so far. */
  title: string;
  /** Foreword text that has streamed in so far. */
  foreword: string;
  /** Whether the stream is still appending characters. */
  isStreaming: boolean;
  /** Whether the preview assets are being prepared after the stream ends. */
  isPreparingPreview: boolean;
}

function getStreamStatusLabel(
  isStreaming: boolean,
  isPreparingPreview: boolean,
  t: (key: string) => string,
): string {
  if (isStreaming) {
    return t('story.introStream.status.drafting');
  }

  if (isPreparingPreview) {
    return t('story.introStream.status.painting');
  }

  return t('story.introStream.status.ready');
}

function Caret(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[0.12em] h-[0.9em] align-[-0.1em] ml-1 bg-brand-primary animate-[intro-caret_1s_steps(2,end)_infinite]"
    />
  );
}

function StoryIntroStream({
  title,
  foreword,
  isStreaming,
  isPreparingPreview,
}: StoryIntroStreamProps): JSX.Element {
  const { t } = useTranslation();
  const hasTitle = title.length > 0;
  const hasForeword = foreword.length > 0;
  const titleCaret = isStreaming && !hasForeword;
  const forewordCaret = isStreaming && hasForeword;
  const statusLabel = getStreamStatusLabel(isStreaming, isPreparingPreview, t);

  return (
    <div className="flex-1 flex items-center justify-center py-16 animate-in fade-in duration-500">
      <div className="relative w-full max-w-3xl mx-auto">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white/95 backdrop-blur-sm py-2 px-5 rounded-full shadow-soft border-2 border-brand-primary/10">
            <Label className="text-brand-primary uppercase tracking-widest text-[11px]">
              {statusLabel}
            </Label>
          </div>
        </div>

        <div className="rounded-3xl border-4 border-brand-secondary/10 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.12)] px-10 py-16 md:px-16 md:py-20 text-center">
          <Label className="text-brand-primary/50 text-[10px] mb-6 block">
            {t('story.introStream.onceUpon')}
          </Label>

          <Heading
            variant="h2"
            className="text-brand-primary italic underline decoration-brand-accent decoration-4 min-h-[3rem]"
          >
            {hasTitle ? title : '\u00A0'}
            {titleCaret && <Caret />}
          </Heading>

          <div className="mt-10 border-l-4 border-brand-accent pl-6 text-left min-h-[4rem]">
            <Text className="text-brand-dark/80 italic">
              {hasForeword ? `"${foreword}` : ''}
              {forewordCaret && <Caret />}
              {hasForeword && !isStreaming ? '"' : ''}
            </Text>
          </div>

          {isPreparingPreview && (
            <div className="mt-10 flex items-center justify-center gap-2 text-brand-muted">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="w-2 h-2 rounded-full bg-brand-primary animate-[intro-dot_1.2s_ease-in-out_infinite]"
                  style={{ animationDelay: `${index * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes intro-caret {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes intro-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default StoryIntroStream;
