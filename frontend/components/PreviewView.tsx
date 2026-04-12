/**
 * Preview storybook UI.
 * Keeps only local page-flip state and sends all business actions upward.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ComicPanel from '@/components/ComicPanel';
import type { ComicPanelData, Story } from '@/types';
import { SketchyButton } from '@/components/design-system/Primitives';
import { Heading, Label, Text } from '@/components/design-system/Typography';

interface PreviewViewProps {
  story: Story;
  onEditPanelImage: (panel: ComicPanelData, editPrompt: string) => Promise<void> | void;
  onGenerate: () => Promise<void>;
  onStartOver: () => void;
}

const PreviewView: React.FC<PreviewViewProps> = ({
  story,
  onEditPanelImage,
  onGenerate,
  onStartOver,
}) => {
  const [previewPage, setPreviewPage] = useState(0);
  const totalPages = 2;
  const middlePanelCount = Math.max(0, story.panels.length - 2);

  const flipTo = (direction: number) => {
    setPreviewPage((previousPage) => Math.max(0, Math.min(totalPages - 1, previousPage + direction)));
  };

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
        onClick={() => flipTo(-1)}
        disabled={previewPage === 0}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center text-2xl !p-0 rounded-full ${previewPage === 0 ? 'opacity-0 pointer-events-none' : ''}`}
        style={{ borderRadius: '9999px' }}
      >
        ←
      </SketchyButton>

      <SketchyButton
        variant="outline"
        aria-label="Next page"
        onClick={() => flipTo(1)}
        disabled={previewPage === totalPages - 1}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center text-2xl !p-0 rounded-full ${previewPage === totalPages - 1 ? 'opacity-0 pointer-events-none' : ''}`}
        style={{ borderRadius: '9999px' }}
      >
        →
      </SketchyButton>

      <div className="flex-1 flex items-center justify-center perspective-[2000px] py-8">
        <div key={previewPage} className="book-flip relative transition-all duration-500 flex items-center justify-center shadow-2xl w-full max-w-[900px] aspect-[3/2]">
          <div className="flex w-full h-full rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.2)] bg-white overflow-hidden relative border-4 border-brand-secondary/5">
            <div className="absolute left-1/2 top-0 bottom-0 w-[4px] bg-black/10 z-30 -translate-x-1/2" />

            <div className="flex-1 relative border-r border-gray-100 overflow-hidden bg-white">
              <div className="absolute inset-0 z-20 page-shadow-left pointer-events-none" />
              {previewPage === 0 ? (
                <div className="h-full flex flex-col justify-center p-12 md:p-16">
                  <Label className="text-brand-primary/50 text-[10px] mb-4">Preview</Label>
                  <Heading variant="h3" className="text-brand-primary mb-6 italic underline decoration-brand-accent decoration-4">
                    {story.title}
                  </Heading>
                  <Text className="text-brand-dark/80 italic border-l-4 border-brand-accent pl-6">
                    &quot;{story.foreword}&quot;
                  </Text>
                  <button
                    type="button"
                    onClick={() => flipTo(1)}
                    className="mt-8 text-brand-primary/40 hover:text-brand-primary transition-colors text-sm font-bold"
                  >
                    Turn page →
                  </button>
                </div>
              ) : (
                <ComicPanel
                  panel={story.panels[story.panels.length - 1]}
                  onEditImage={(editPrompt) => onEditPanelImage(story.panels[story.panels.length - 1], editPrompt)}
                />
              )}
            </div>

            <div className="flex-1 relative overflow-hidden bg-white">
              <div className="absolute inset-0 z-20 page-shadow-right pointer-events-none" />
              {previewPage === 0 ? (
                <ComicPanel
                  panel={story.panels[0]}
                  onEditImage={(editPrompt) => onEditPanelImage(story.panels[0], editPrompt)}
                />
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center pointer-events-none z-50">
        <div className="bg-white/95 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl flex items-center space-x-4 border-2 border-brand-secondary/20">
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
            {previewPage === 0 ? 'Opening' : 'Ending'}
          </span>
          <div className="flex space-x-1.5">
            {[...Array(totalPages)].map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === previewPage ? 'bg-brand-primary w-6' : 'bg-brand-light w-1.5 border border-brand-secondary/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewView;
