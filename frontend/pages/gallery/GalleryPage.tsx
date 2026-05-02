/**
 * Gallery page container.
 * Renders loading, empty, and card-grid states from page-level data.
 */
import { Link } from 'react-router-dom';
import type { StoryListItem, StoryVisibility } from '@api';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import StorageImage from '@/components/StorageImage';
import { SketchyInput } from '@/components/design-system/Forms';
import { SketchyButton } from '@/components/design-system/Primitives';
import { formatStoryDate, getStoryDisplayTitle } from './gallery.helpers';
import { useGalleryPage } from './useGalleryPage';
import { ARCHETYPES } from '@/components/kidWizard.constants';

interface StoryCardProps {
  story: StoryListItem;
  onDeleteStory: (storyId: number) => Promise<void>;
  onUpdateVisibility: (storyId: number, visibility: StoryVisibility) => Promise<void>;
}

interface SharingControlProps {
  storyTitle: string;
  value: StoryVisibility;
  onChange: (visibility: StoryVisibility) => Promise<void>;
}

const sharingOptions: StoryVisibility[] = ['private', 'shared_with_friends'];

function getArchetypeLabel(archetype: string, t: TFunction<'translation'>): string {
  const match = ARCHETYPES.find((option) => option.id === archetype || option.label === archetype);

  if (!match) {
    return archetype;
  }

  return t(`kidWizard.archetypes.${match.id}.label` as const);
}

function SharingControl({ storyTitle, value, onChange }: SharingControlProps): JSX.Element {
  const { t } = useTranslation();
  const getVisibilityLabel = (visibility: StoryVisibility): string =>
    visibility === 'shared_with_friends'
      ? t('galleryPage.sharing.friends')
      : t('galleryPage.sharing.private');

  return (
    <fieldset className="mb-4 flex items-center justify-between gap-3">
      <legend className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {t('galleryPage.sharing.label')}
      </legend>
      <div className="inline-grid grid-cols-2 gap-0.5 rounded-full border border-purple-100 bg-purple-50 p-0.5 shadow-inner">
        {sharingOptions.map((option) => {
          const isSelected = value === option;
          const visibleLabel = getVisibilityLabel(option);
          const selectedClassName = isSelected
            ? 'bg-white text-purple-900 shadow-sm'
            : 'text-purple-500 hover:bg-white/60 hover:text-purple-800';

          return (
            <button
              key={option}
              type="button"
              aria-label={`${getVisibilityLabel(option)} sharing for ${storyTitle}`}
              aria-pressed={isSelected}
              onClick={() => void onChange(option)}
              className={`min-h-8 min-w-16 rounded-full px-3 py-1 text-center text-[10px] font-black uppercase leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300 ${selectedClassName}`}
            >
              {visibleLabel}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function StoryCard({ story, onDeleteStory, onUpdateVisibility }: StoryCardProps): JSX.Element {
  const { t } = useTranslation();
  const fallbackTitle = t('galleryPage.untitledMasterpiece');
  const displayTitle = getStoryDisplayTitle(story.title, fallbackTitle);
  const archetypeLabel = story.profile.archetype
    ? getArchetypeLabel(story.profile.archetype, t)
    : null;
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

        <SharingControl
          storyTitle={displayTitle}
          value={story.visibility}
          onChange={(visibility) => onUpdateVisibility(story.id, visibility)}
        />

        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase tracking-wide">
            {story.profile.name}
          </span>

          {archetypeLabel ? (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full uppercase tracking-wide">
              {archetypeLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-4 text-xs text-gray-400 font-medium">
          {formatStoryDate(story.created_at)}
        </div>
      </div>
    </div>
  );
}

function GalleryPage(): JSX.Element {
  const {
    isLoading,
    stories,
    filteredStories,
    pagedStories,
    page,
    totalPages,
    searchQuery,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    setSearchQuery,
    setDateFrom,
    setDateTo,
    setSortKey,
    setSortDir,
    setPage,
    onDeleteStory,
    onUpdateVisibility,
  } = useGalleryPage();
  const { t } = useTranslation();
  const resultsCount = filteredStories.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black text-gray-800">{t('galleryPage.mySavedBooks')}</h2>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 rounded-[2rem] border-2 border-gray-100 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {t('galleryPage.filters.searchLabel')}
          </label>
          <SketchyInput
            type="search"
            placeholder={t('galleryPage.filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="text-base px-4 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {t('galleryPage.filters.fromDateLabel')}
          </label>
          <SketchyInput
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="text-base px-4 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {t('galleryPage.filters.toDateLabel')}
          </label>
          <SketchyInput
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="text-base px-4 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {t('galleryPage.filters.sortLabel')}
          </label>
          <div className="flex gap-2">
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as 'created_at' | 'title')}
              className="w-full rounded-full border-2 border-purple-100 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-900"
            >
              <option value="created_at">{t('galleryPage.filters.sortDate')}</option>
              <option value="title">{t('galleryPage.filters.sortTitle')}</option>
            </select>
            <select
              value={sortDir}
              onChange={(event) => setSortDir(event.target.value as 'asc' | 'desc')}
              className="w-full rounded-full border-2 border-purple-100 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-900"
            >
              <option value="desc">{t('galleryPage.filters.sortDesc')}</option>
              <option value="asc">{t('galleryPage.filters.sortAsc')}</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-500">
              {t('galleryPage.resultsCount', { count: resultsCount })}
            </div>
            <div className="flex items-center gap-3">
              <SketchyButton
                type="button"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('galleryPage.pagination.previous')}
              </SketchyButton>
              <span className="text-sm font-semibold text-gray-600">
                {t('galleryPage.pagination.pageOf', { page, total: totalPages })}
              </span>
              <SketchyButton
                type="button"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('galleryPage.pagination.next')}
              </SketchyButton>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {pagedStories.map((story) => (
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

            {stories.length > 0 && filteredStories.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-400">
                <p className="text-xl font-medium italic">{t('galleryPage.noMatches')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default GalleryPage;
