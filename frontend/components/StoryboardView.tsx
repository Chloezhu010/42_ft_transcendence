/**
 * Finished storybook UI.
 * Keeps only local reading state and forwards edit requests to the page layer.
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ComicPanel from '@/components/ComicPanel';
import StorageImage from '@/components/StorageImage';
import StoryReadAloudControl from '@/components/StoryReadAloudControl';
import { SketchyButton } from '@/components/design-system/Primitives';
import { Heading, Label, Text } from '@/components/design-system/Typography';
import type { ComicPanelData, KidProfile, Story } from '@/types';
import { getStoryReadAloudText } from '@/utils';

interface StoryboardViewProps {
  story: Story;
  profile: KidProfile | null;
  onEditPanelImage: (panel: ComicPanelData, editPrompt: string) => Promise<void> | void;
  isReadOnly?: boolean;
  ownerUserId?: number | null;
}

interface StoryboardNavButtonProps {
  direction: 'previous' | 'next';
  disabled: boolean;
  onClick: () => void;
}

interface StoryboardSpreadLayoutProps {
  leftPage: ReactNode;
  rightPage: ReactNode;
}

interface StoryboardProgressProps {
  currentPage: number;
  totalStates: number;
  pageLabel: string;
}

const HIDDEN_NAVIGATION_CLASS = 'opacity-0 pointer-events-none';
const ROUNDED_BUTTON_STYLE = { borderRadius: '9999px' };

function getPageLabel(
  currentPage: number,
  totalStates: number,
  t: (key: string, options?: { number?: number }) => string,
): string {
  if (currentPage === 0) {
    return t('story.storyboard.pageLabel.frontCover');
  }

  if (currentPage === totalStates - 1) {
    return t('story.storyboard.pageLabel.backCover');
  }

  return t('story.storyboard.pageLabel.spread', { number: currentPage });
}

function getSpreadPanelIndexes(currentPage: number): {
  leftPanelIndex: number;
  rightPanelIndex: number;
} {
  return {
    leftPanelIndex: (currentPage - 1) * 2 - 1,
    rightPanelIndex: (currentPage - 1) * 2,
  };
}

function getBookFrameClassName(isCoverPage: boolean): string {
  const pageWidthClass = isCoverPage ? 'w-[350px] md:w-[450px]' : 'w-full max-w-[900px]';
  const pageAspectClass = isCoverPage ? 'aspect-[3/4]' : 'aspect-[3/2]';

  return `book-flip relative transition-all duration-500 flex items-center justify-center shadow-2xl ${pageWidthClass} ${pageAspectClass}`;
}

function getProgressMarkerClassName(isActive: boolean): string {
  if (isActive) {
    return 'h-1.5 rounded-full transition-all duration-300 bg-brand-primary w-6';
  }

  return 'h-1.5 rounded-full transition-all duration-300 bg-brand-light w-1.5 border border-brand-secondary/10';
}

function StoryboardNavButton({
  direction,
  disabled,
  onClick,
}: StoryboardNavButtonProps): JSX.Element {
  const positionClass = direction === 'previous' ? 'left-0' : 'right-0';
  const arrow = direction === 'previous' ? '←' : '→';
  const hiddenStateClass = disabled ? HIDDEN_NAVIGATION_CLASS : '';

  return (
    <SketchyButton
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={`absolute ${positionClass} top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center text-2xl !p-0 rounded-full ${hiddenStateClass}`}
      style={ROUNDED_BUTTON_STYLE}
    >
      {arrow}
    </SketchyButton>
  );
}

function StoryboardSpreadLayout({
  leftPage,
  rightPage,
}: StoryboardSpreadLayoutProps): JSX.Element {
  return (
    <div className="flex w-full h-full rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.2)] bg-white overflow-hidden relative border-4 border-brand-secondary/5">
      <div className="absolute left-1/2 top-0 bottom-0 w-[4px] bg-black/10 z-30 -translate-x-1/2" />

      <div className="flex-1 relative border-r border-gray-100 overflow-hidden bg-white">
        <div className="absolute inset-0 z-20 page-shadow-left pointer-events-none" />
        {leftPage}
      </div>

      <div className="flex-1 relative overflow-hidden bg-white">
        <div className="absolute inset-0 z-20 page-shadow-right pointer-events-none" />
        {rightPage}
      </div>
    </div>
  );
}

function StoryboardProgress({
  currentPage,
  totalStates,
  pageLabel,
}: StoryboardProgressProps): JSX.Element {
  return (
    <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center pointer-events-none z-50">
      <div className="bg-white/95 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl flex items-center space-x-4 border-2 border-brand-secondary/20">
        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
          {pageLabel}
        </span>
        <div className="flex space-x-1.5">
          {Array.from({ length: totalStates }, (_, index) => (
            <div key={index} className={getProgressMarkerClassName(index === currentPage)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryboardView({
  story,
  profile,
  onEditPanelImage,
  isReadOnly = false,
  ownerUserId = null,
}: StoryboardViewProps): JSX.Element {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const backHref = ownerUserId ? `/friends/${ownerUserId}/library` : '/gallery';

  const displayedPanelCount = story.panels.length || 10;
  const spreadsNeeded = Math.ceil((displayedPanelCount + 2) / 2);
  const totalStates = 2 + spreadsNeeded;
  const isFrontCover = currentPage === 0;
  const isBackCover = currentPage === totalStates - 1;
  const isIntroductionSpread = currentPage === 1;
  const isFinalSpread = currentPage === totalStates - 2;
  const isCoverPage = isFrontCover || isBackCover;
  const { leftPanelIndex, rightPanelIndex } = getSpreadPanelIndexes(currentPage);
  const leftPanel = story.panels[leftPanelIndex]!;
  const rightPanel = story.panels[rightPanelIndex]!;
  const readAloudText = getStoryReadAloudText(story);

  const navigate = (direction: number) => {
    setCurrentPage((previousPage) => Math.max(0, Math.min(totalStates - 1, previousPage + direction)));
  };

  const pageLabel = getPageLabel(currentPage, totalStates, t);
  const bookFrameClassName = getBookFrameClassName(isCoverPage);

  const leftSpreadPage = isIntroductionSpread ? (
    <div className="h-full flex flex-col justify-center p-12 md:p-16">
      <Heading variant="h3" className="text-brand-primary mb-6 italic underline decoration-brand-accent decoration-4">
        {t('story.storyboard.introduction')}
      </Heading>
      <Text className="text-brand-dark/80 italic border-l-4 border-brand-accent pl-6">&quot;{story.foreword}&quot;</Text>
      <Label className="mt-8 text-brand-primary/50 text-[10px]">
        {t('story.storyboard.originalLabel')}
      </Label>
    </div>
  ) : (
    <ComicPanel
      panel={leftPanel}
      onEditImage={isReadOnly ? undefined : (editPrompt) => onEditPanelImage(leftPanel, editPrompt)}
    />
  );

  const rightSpreadPage = isFinalSpread ? (
    <div className="h-full flex flex-col items-center justify-center bg-brand-accent p-12 text-brand-dark text-center border-8 border-brand-primary shadow-inner">
      <div className="text-7xl mb-6 drop-shadow-lg">✨</div>
      <Heading variant="h3" className="mb-4 uppercase text-brand-dark">
        {t('story.storyboard.theEnd')}
      </Heading>
      <Text className="font-bold italic text-brand-dark/70">
        {t('story.storyboard.closingLine', { name: profile?.name || '' })}
      </Text>
      <SketchyButton onClick={() => navigate(1)} className="mt-8 px-8 py-3 text-sm rounded-full">
        {t('story.storyboard.closeBook')}
      </SketchyButton>
    </div>
  ) : (
    <ComicPanel
      panel={rightPanel}
      onEditImage={isReadOnly ? undefined : (editPrompt) => onEditPanelImage(rightPanel, editPrompt)}
    />
  );

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-700 h-[calc(100vh-140px)] relative">
      <div className="absolute top-4 left-4 z-30">
        <Link to={backHref} className="text-sm font-bold text-brand-muted hover:text-brand-primary flex items-center gap-2 transition-colors bg-white/80 backdrop-blur-sm py-3 px-6 rounded-full shadow-soft border-2 border-brand-primary/10">
          <span>←</span> {t('story.storyboard.backToLibrary')}
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        <StoryReadAloudControl text={readAloudText} />
        {isReadOnly ? (
          <div className="bg-white/90 backdrop-blur-sm py-2 px-4 rounded-full shadow-soft border border-brand-secondary/20">
            <Label className="text-brand-primary uppercase tracking-widest">Read Only</Label>
          </div>
        ) : null}
      </div>

      <StoryboardNavButton direction="previous" disabled={isFrontCover} onClick={() => navigate(-1)} />
      <StoryboardNavButton direction="next" disabled={isBackCover} onClick={() => navigate(1)} />

      <div className="flex-1 flex items-center justify-center perspective-[2000px] py-8">
        <div key={currentPage} className={bookFrameClassName}>
          {isFrontCover && (
            <div className="w-full h-full bg-brand-primary rounded-r-3xl shadow-[20px_20px_60px_rgba(0,0,0,0.3)] overflow-hidden border-y-8 border-r-8 border-brand-secondary relative">
              {story.coverImageUrl ? (
                <StorageImage src={story.coverImageUrl} alt={story.title || 'Cover'} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary animate-pulse text-white font-bold">
                  {t('story.storyboard.paintingCover')}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              <div className="absolute bottom-12 left-10 right-10">
                <Heading variant="h2" className="text-white mb-2 uppercase drop-shadow-xl">{story.title}</Heading>
                <Label className="text-brand-accent opacity-90">
                  {t('story.storyboard.heroicMasterpiece')}
                </Label>
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/20" />
              <div onClick={() => navigate(1)} className="absolute inset-0 cursor-pointer group">
                <div className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/20 p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-3xl">📖</span>
                </div>
              </div>
            </div>
          )}

          {!isFrontCover && !isBackCover && (
            <StoryboardSpreadLayout leftPage={leftSpreadPage} rightPage={rightSpreadPage} />
          )}

          {isBackCover && (
            <div className="w-full h-full bg-brand-secondary rounded-l-3xl shadow-[-20px_20px_60px_rgba(0,0,0,0.3)] overflow-hidden border-y-8 border-l-8 border-brand-dark flex flex-col items-center justify-center p-12 text-center relative">
              <div className="text-7xl mb-8">✨</div>
              <Heading variant="h3" className="text-white mb-4">
                {t('story.storyboard.storyCompleteTitle')}
              </Heading>
              <Text className="text-brand-surface mb-10 italic">
                <strong>{story.title}</strong>{' '}
                {isReadOnly
                  ? t('story.storyboard.storyCompleteBodyShared')
                  : t('story.storyboard.storyCompleteBody')}
              </Text>
              <div className="mt-8 flex flex-col items-center gap-2">
                <button type="button" onClick={() => navigate(-1)} className="text-brand-surface/60 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">{t('story.storyboard.reread')}</button>
                <Link to={backHref} className="text-brand-surface/40 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors border-b border-brand-surface/20 pb-0.5">{t('story.storyboard.backToLibrary')}</Link>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-black/20" />
            </div>
          )}
        </div>
      </div>

      <StoryboardProgress currentPage={currentPage} totalStates={totalStates} pageLabel={pageLabel} />
    </div>
  );
}

export default StoryboardView;
