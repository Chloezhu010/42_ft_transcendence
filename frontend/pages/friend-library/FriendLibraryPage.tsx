/**
 * Friend library page.
 * Shows comics shared by a single accepted friend and links into read-only story viewing.
 */
import { Link } from 'react-router-dom';
import StorageImage from '@/components/StorageImage';
import { formatStoryDate, getStoryDisplayTitle } from '@/pages/gallery/gallery.helpers';
import { useFriendLibraryPage } from './useFriendLibraryPage';

export function FriendLibraryPage(): JSX.Element {
  const { errorMessage, friend, friendUserId, isLoading, stories } = useFriendLibraryPage();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="rounded-[2rem] border-2 border-red-200 bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-black text-gray-800">Shared Library</h1>
          <p className="mt-4 text-base font-medium text-red-600">{errorMessage}</p>
          <Link
            to="/friends"
            className="inline-flex mt-6 rounded-full border border-brand-primary/20 px-5 py-3 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-light"
          >
            Back to Friends
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <Link to="/friends" className="text-sm font-bold text-brand-muted hover:text-brand-primary transition-colors">
            ← Back to Friends
          </Link>
          <h1 className="mt-3 text-4xl font-black text-gray-800">{friend?.username}&apos;s Shared Library</h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Browse the comics this friend chose to share with accepted friends.
          </p>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center text-gray-400 shadow-sm">
          <p className="text-xl font-medium italic">No shared comics yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {stories.map((story) => (
            <div key={story.id} className="bg-white rounded-[2rem] shadow-xl overflow-hidden border-2 border-gray-100">
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                {story.cover_image_url ? (
                  <StorageImage
                    src={story.cover_image_url}
                    alt={getStoryDisplayTitle(story.title)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-4xl">?</div>
                )}
              </div>

              <div className="p-5">
                <h2 className="text-xl font-black text-gray-800 leading-tight mb-2 line-clamp-2">
                  {getStoryDisplayTitle(story.title)}
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full uppercase tracking-wide">
                    {story.profile.name}
                  </span>
                </div>
                <div className="text-xs text-gray-400 font-medium mb-4">{formatStoryDate(story.created_at)}</div>
                <Link
                  to={`/friends/${friendUserId}/library/${story.id}`}
                  className="inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  Read Shared Comic
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
