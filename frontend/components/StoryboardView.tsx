import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ComicPanel from './ComicPanel';
import StorageImage from './StorageImage';
import { SketchyButton } from './design-system/Primitives';
import { Heading, Label, Text } from './design-system/Typography';
import { ComicPanelData, KidProfile, Story } from '../types';

interface StoryboardViewProps {
  story: Story;
  profile: KidProfile | null;
  updatePanel: (panel: ComicPanelData) => void | Promise<void>;
}

const StoryboardView: React.FC<StoryboardViewProps> = ({ story, profile, updatePanel }) => {
  const [currentPage, setCurrentPage] = useState(0);

  const panelCount = story.panels.length || 10;
  const spreadsNeeded = Math.ceil((panelCount + 2) / 2);
  const totalStates = 2 + spreadsNeeded;

  const navigate = (dir: number) => {
    setCurrentPage(previousPage => Math.max(0, Math.min(totalStates - 1, previousPage + dir)));
  };

  const pageLabel = currentPage === 0
    ? 'Front Cover'
    : currentPage === totalStates - 1
      ? 'Back Cover'
      : `Spread ${currentPage}`;

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-700 h-[calc(100vh-140px)] relative">
      <div className="absolute top-4 left-4 z-30">
        <Link to="/gallery" className="text-sm font-bold text-brand-muted hover:text-brand-primary flex items-center gap-2 transition-colors bg-white/80 backdrop-blur-sm py-3 px-6 rounded-full shadow-soft border-2 border-brand-primary/10">
          <span>←</span> Back to Library
        </Link>
      </div>

      <SketchyButton
        variant="outline"
        onClick={() => navigate(-1)}
        disabled={currentPage === 0}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center text-2xl !p-0 rounded-full ${currentPage === 0 ? 'opacity-0 pointer-events-none' : ''}`}
        style={{ borderRadius: '9999px' }}
      >
        ←
      </SketchyButton>

      <SketchyButton
        variant="outline"
        onClick={() => navigate(1)}
        disabled={currentPage === totalStates - 1}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center text-2xl !p-0 rounded-full ${currentPage === totalStates - 1 ? 'opacity-0 pointer-events-none' : ''}`}
        style={{ borderRadius: '9999px' }}
      >
        →
      </SketchyButton>

      <div className="flex-1 flex items-center justify-center perspective-[2000px] py-8">
        <div
          key={currentPage}
          className={`book-flip relative transition-all duration-500 flex items-center justify-center shadow-2xl
            ${currentPage === 0 || currentPage === totalStates - 1 ? 'w-[350px] md:w-[450px]' : 'w-full max-w-[900px]'}
            ${currentPage === 0 || currentPage === totalStates - 1 ? 'aspect-[3/4]' : 'aspect-[3/2]'}
          `}
        >
          {currentPage === 0 && (
            <div className="w-full h-full bg-brand-primary rounded-r-3xl shadow-[20px_20px_60px_rgba(0,0,0,0.3)] overflow-hidden border-y-8 border-r-8 border-brand-secondary relative">
              {story.coverImageUrl ? (
                <StorageImage src={story.coverImageUrl} alt={story.title || 'Cover'} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-secondary animate-pulse text-white font-bold">Painting Cover...</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              <div className="absolute bottom-12 left-10 right-10">
                <Heading variant="h2" className="text-white mb-2 uppercase drop-shadow-xl">{story.title}</Heading>
                <Label className="text-brand-accent opacity-90">A Heroic Masterpiece</Label>
              </div>
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/20" />
              <div onClick={() => navigate(1)} className="absolute inset-0 cursor-pointer group">
                <div className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/20 p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-3xl">📖</span>
                </div>
              </div>
            </div>
          )}

          {currentPage > 0 && currentPage < totalStates - 1 && (
            <div className="flex w-full h-full rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.2)] bg-white overflow-hidden relative border-4 border-brand-secondary/5">
              <div className="absolute left-1/2 top-0 bottom-0 w-[4px] bg-black/10 z-30 -translate-x-1/2" />

              <div className="flex-1 relative border-r border-gray-100 overflow-hidden bg-white">
                <div className="absolute inset-0 z-20 page-shadow-left pointer-events-none" />
                {currentPage === 1 ? (
                  <div className="h-full flex flex-col justify-center p-12 md:p-16">
                    <Heading variant="h3" className="text-brand-primary mb-6 italic underline decoration-brand-accent decoration-4">Introduction</Heading>
                    <Text className="text-brand-dark/80 italic border-l-4 border-brand-accent pl-6">"{story.foreword}"</Text>
                    <Label className="mt-8 text-brand-primary/50 text-[10px]">A WonderComic Original</Label>
                  </div>
                ) : (
                  <ComicPanel
                    panel={story.panels[(currentPage - 1) * 2 - 1]}
                    onUpdate={updatePanel}
                    charDesc={story.characterDescription}
                    profile={profile}
                  />
                )}
              </div>

              <div className="flex-1 relative overflow-hidden bg-white">
                <div className="absolute inset-0 z-20 page-shadow-right pointer-events-none" />
                {currentPage === totalStates - 2 ? (
                  <div className="h-full flex flex-col items-center justify-center bg-brand-accent p-12 text-brand-dark text-center border-8 border-brand-primary shadow-inner">
                    <div className="text-7xl mb-6 drop-shadow-lg">✨</div>
                    <Heading variant="h3" className="mb-4 uppercase text-brand-dark">THE END</Heading>
                    <Text className="font-bold italic text-brand-dark/70">May your dreams be as bold as your story, {profile?.name}.</Text>
                    <SketchyButton onClick={() => navigate(1)} className="mt-8 px-8 py-3 text-sm rounded-full">Close Book</SketchyButton>
                  </div>
                ) : (
                  <ComicPanel
                    panel={story.panels[(currentPage - 1) * 2]}
                    onUpdate={updatePanel}
                    charDesc={story.characterDescription}
                    profile={profile}
                  />
                )}
              </div>
            </div>
          )}

          {currentPage === totalStates - 1 && (
            <div className="w-full h-full bg-brand-secondary rounded-l-3xl shadow-[-20px_20px_60px_rgba(0,0,0,0.3)] overflow-hidden border-y-8 border-l-8 border-brand-dark flex flex-col items-center justify-center p-12 text-center relative">
              <div className="text-7xl mb-8">✨</div>
              <Heading variant="h3" className="text-white mb-4">Your Story is Complete</Heading>
              <Text className="text-brand-surface mb-10 italic">
                <strong>{story.title}</strong> is ready to enjoy anytime in your library.
              </Text>
              <div className="mt-8 flex flex-col items-center gap-2">
                <button onClick={() => navigate(-1)} className="text-brand-surface/60 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">Re-read Tale</button>
                <Link to="/gallery" className="text-brand-surface/40 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors border-b border-brand-surface/20 pb-0.5">Back to Library</Link>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-black/20" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center pointer-events-none z-50">
        <div className="bg-white/95 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl flex items-center space-x-4 border-2 border-brand-secondary/20">
          <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
            {pageLabel}
          </span>
          <div className="flex space-x-1.5">
            {[...Array(totalStates)].map((_, index) => (
              <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${index === currentPage ? 'bg-brand-primary w-6' : 'bg-brand-light w-1.5 border border-brand-secondary/10'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryboardView;
