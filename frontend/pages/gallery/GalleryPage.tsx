/**
 * Gallery page container.
 * Renders loading, empty, and card-grid states from page-level data.
 */
import { Link } from 'react-router-dom';
import type { StoryListItem, StoryVisibility } from '@api';
import { useTranslation } from 'react-i18next';
import StorageImage from '@/components/StorageImage';
import { formatStoryDate, getStoryDisplayTitle, getVisibilityLabel } from './gallery.helpers';
import { useGalleryPage } from './useGalleryPage';

interface StoryCardProps {
  story: StoryListItem;
  onDeleteStory: (storyId: number) => Promise<void>;
  onUpdateVisibility: (storyId: number, visibility: StoryVisibility) => Promise<void>;
}

function StoryCard({ story, onDeleteStory, onUpdateVisibility }: StoryCardProps): JSX.Element {
  const { t } = useTranslation();
  const fallbackTitle = t('galleryPage.untitledMasterpiece');
  const displayTitle = getStoryDisplayTitle(story.title, fallbackTitle);
  return (
    <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden group border-2 border-gray-100 hover:border-purple-200 transition-all hover:-translate-y-1 relative">
      <button
        type="button"
        onClick={() => void onDeleteStory(story.id)}
        className="absolute top-4 right-4 z-30 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Delete Story"
      >
        🗑️
      </button>

      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        {story.cover_image_url ? (
          <StorageImage
            src={story.cover_image_url}
            alt={displayTitle}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-4xl">?</div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Link
            to={`/book/${story.id}`}
            className="px-8 py-3 bg-white text-purple-900 font-black rounded-full shadow-xl transform scale-90 group-hover:scale-100 transition-all"
          >
            {t('galleryPage.readNow')}
          </Link>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-black text-gray-800 leading-tight mb-2 line-clamp-2">
          {displayTitle}
        </h3>

        <div className="mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
            Sharing
          </label>
          <select
            aria-label={`Sharing for ${getStoryDisplayTitle(story.title)}`}
            value={story.visibility}
            onChange={(event) => void onUpdateVisibility(story.id, event.target.value as StoryVisibility)}
            className="w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-900 outline-none focus:border-purple-400"
          >
            <option value="private">{getVisibilityLabel('private')}</option>
            <option value="shared_with_friends">{getVisibilityLabel('shared_with_friends')}</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase tracking-wide">
            {story.profile.name}
          </span>

          {story.profile.archetype && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full uppercase tracking-wide">
              {story.profile.archetype}
            </span>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-400 font-medium">
          {formatStoryDate(story.created_at)}
        </div>
      </div>
    </div>
  );
}

function GalleryPage(): JSX.Element {
  const { isLoading, onDeleteStory, onUpdateVisibility, stories } = useGalleryPage();
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black text-gray-800">{t('galleryPage.mySavedBooks')}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onDeleteStory={onDeleteStory}
              onUpdateVisibility={onUpdateVisibility}
            />
          ))}

          {stories.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400">
              <p className="text-xl font-medium italic">{t('galleryPage.noStoriesFound')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GalleryPage;
