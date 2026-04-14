/**
 * Preview storybook UI.
 * Keeps only local page-flip state and sends all business actions upward.
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ComicPanel from '@/components/ComicPanel';
import type { ComicPanelData, Story } from '@/types';
import { SketchyButton } from '@/components/design-system/Primitives';
import { Heading, Label, Text } from '@/components/design-system/Typography';

const PREVIEW_PAGE_LABELS = ['Opening', 'Ending'] as const;

interface PreviewViewProps {
  story: Story;
  onEditPanelImage: (panel: ComicPanelData, editPrompt: string) => Promise<void> | void;
  onGenerate: () => Promise<void>;
  onStartOver: () => void;
}

interface PreviewBookFrameProps {
  currentPage: number;
  currentPageLabel: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  leftPage: ReactNode;
  rightPage: ReactNode;
}

interface PreviewTitlePageProps {
  title: string;
  foreword: string;
  onOpenEndingSpread: () => void;
}

interface PreviewPanelPageProps {
  panel: ComicPanelData;
  onEditImage: (editPrompt: string) => Promise<void> | void;
}

interface PreviewGeneratePageProps {
  middlePanelCount: number;
  onGenerate: () => Promise<void>;
  onStartOver: () => void;
}

function PreviewBookFrame({
  currentPage,
  currentPageLabel,
  onPreviousPage,
  onNextPage,
  leftPage,
  rightPage,
}: PreviewBookFrameProps): JSX.Element {
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === PREVIEW_PAGE_LABELS.length - 1;
  const previousButtonStateClass = isFirstPage ? 'opacity-0 pointer-events-none' : '';
  const nextButtonStateClass = isLastPage ? 'opacity-0 pointer-events-none' : '';

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-700 h-[calc(100vh-140px)] relative">
      <div className="absolute top-4 left-4 z-30">
        <Link to="/gallery" className="text-sm font-bold text-brand-muted hover:text-brand-primary flex items-center gap-2 transition-colors bg-white/80 backdrop-blur-sm py-3 px-6 rounded-full shadow-soft border-2 border-brand-primary/10">
          <span>←</span> Back to Library
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-30">
        <div className="bg-white/90 backdrop-blur-sm py-2 px-4 rounded-full shadow-soft border border-brand-secondary/20">
          <Label className="text-brand-primary uppercase tracking-widest">Preview</Label>
        </div>
      </div>

      <SketchyButton
        variant="outline"
        aria-label="Previous page"
        onClick={onPreviousPage}
        disabled={isFirstPage}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center text-2xl !p-0 rounded-full ${previousButtonStateClass}`}
        style={{ borderRadius: '9999px' }}
      >
        ←
      </SketchyButton>

      <SketchyButton
        variant="outline"
        aria-label="Next page"
        onClick={onNextPage}
        disabled={isLastPage}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center text-2xl !p-0 rounded-full ${nextButtonStateClass}`}
        style={{ borderRadius: '9999px' }}
      >
        →
      </SketchyButton>

      <div className="flex-1 flex items-center justify-center perspective-[2000px] py-8">
        <div key={currentPage} className="book-flip relative transition-all duration-500 flex items-center justify-center shadow-2xl w-full max-w-[900px] aspect-[3/2]">
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
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center pointer-events-none z-50">
        <div className="bg-white/95 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl flex items-center space-x-4 border-2 border-brand-secondary/20">
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
            {currentPageLabel}
          </span>
          <div className="flex space-x-1.5">
            {PREVIEW_PAGE_LABELS.map((pageLabel, index) => {
              const isActivePage = index === currentPage;
              const pageIndicatorClass = isActivePage
                ? 'bg-brand-primary w-6'
                : 'bg-brand-light w-1.5 border border-brand-secondary/10';

              return (
                <div
                  key={pageLabel}
                  className={`h-1.5 rounded-full transition-all duration-300 ${pageIndicatorClass}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTitlePage({
  title,
  foreword,
  onOpenEndingSpread,
}: PreviewTitlePageProps): JSX.Element {
  return (
    <div className="h-full flex flex-col justify-center p-12 md:p-16">
      <Label className="text-brand-primary/50 text-[10px] mb-4">Preview</Label>
      <Heading variant="h3" className="text-brand-primary mb-6 italic underline decoration-brand-accent decoration-4">
        {title}
      </Heading>
      <Text className="text-brand-dark/80 italic border-l-4 border-brand-accent pl-6">
        &quot;{foreword}&quot;
      </Text>
      <button
        type="button"
        onClick={onOpenEndingSpread}
        className="mt-8 text-brand-primary/40 hover:text-brand-primary transition-colors text-sm font-bold"
      >
        Turn page →
      </button>
    </div>
  );
}

function PreviewPanelPage({
  panel,
  onEditImage,
}: PreviewPanelPageProps): JSX.Element {
  return (
    <ComicPanel panel={panel} onEditImage={onEditImage} />
  );
}

function PreviewGeneratePage({
  middlePanelCount,
  onGenerate,
  onStartOver,
}: PreviewGeneratePageProps): JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-brand-accent/10 to-white">
      <div className="text-5xl mb-6">✨</div>
      <Heading variant="h3" className="text-brand-primary mb-3">Like what you see?</Heading>
      <Text className="text-brand-dark/60 italic mb-8 text-sm">
        We&apos;ll fill in the {middlePanelCount} panels between opening and ending.
      </Text>
      <div className="flex flex-col gap-3 w-full max-w-[220px]">
        <SketchyButton onClick={() => void onGenerate()} className="px-6 py-3 rounded-full text-sm w-full">
          Generate Full Story
        </SketchyButton>
        <SketchyButton
          variant="outline"
          onClick={onStartOver}
          className="px-6 py-3 rounded-full text-sm w-full"
        >
          Start Over
        </SketchyButton>
      </div>
    </div>
  );
}

function PreviewView({
  story,
  onEditPanelImage,
  onGenerate,
  onStartOver,
}: PreviewViewProps): JSX.Element | null {
  const [previewPage, setPreviewPage] = useState(0);
  const firstPanel = story.panels[0];
  const lastPanel = story.panels[story.panels.length - 1];
  const isOpeningSpread = previewPage === 0;
  const currentPageLabel = PREVIEW_PAGE_LABELS[previewPage];
  const middlePanelCount = Math.max(0, story.panels.length - 2);

  if (!firstPanel || !lastPanel) {
    return null;
  }

  const showPreviousPage = () => {
    setPreviewPage(0);
  };

  const showNextPage = () => {
    setPreviewPage(1);
  };

  const handleFirstPanelEdit = (editPrompt: string) => {
    return onEditPanelImage(firstPanel, editPrompt);
  };

  const handleLastPanelEdit = (editPrompt: string) => {
    return onEditPanelImage(lastPanel, editPrompt);
  };

  const leftPage = isOpeningSpread
    ? (
      <PreviewTitlePage
        title={story.title}
        foreword={story.foreword}
        onOpenEndingSpread={showNextPage}
      />
    )
    : (
      <PreviewPanelPage
        panel={lastPanel}
        onEditImage={handleLastPanelEdit}
      />
    );

  const rightPage = isOpeningSpread
    ? (
      <PreviewPanelPage
        panel={firstPanel}
        onEditImage={handleFirstPanelEdit}
      />
    )
    : (
      <PreviewGeneratePage
        middlePanelCount={middlePanelCount}
        onGenerate={onGenerate}
        onStartOver={onStartOver}
      />
    );

  return (
    <PreviewBookFrame
      currentPage={previewPage}
      currentPageLabel={currentPageLabel}
      onPreviousPage={showPreviousPage}
      onNextPage={showNextPage}
      leftPage={leftPage}
      rightPage={rightPage}
    />
  );
}

export default PreviewView;
