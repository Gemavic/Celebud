import { Play, Clock, Eye, Volume2, Mic2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaContentWithRelations } from '../lib/database.types';
import { formatDistanceToNow } from '../utils/date';

interface MediaCardProps {
  content: MediaContentWithRelations;
}

const mediaTypeIcons: Record<string, typeof FileText> = {
  video: Play,
  audio: Volume2,
  interview: Mic2,
  article: FileText,
};

export function MediaCard({ content }: MediaCardProps) {
  const MediaIcon = content.media_type && content.media_type in mediaTypeIcons
    ? mediaTypeIcons[content.media_type]
    : FileText;

  return (
    <Link to={`/article/${content.id}`} className="block">
      <article className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative overflow-hidden h-56">
        <img
          src={content.thumbnail_url || ''}
          alt={content.title}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {content.is_trending && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <span>🔥</span>
            <span>Trending</span>
          </div>
        )}

        {content.categories && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm"
            style={{ backgroundColor: `${content.categories.color}CC` }}
          >
            {content.categories.name}
          </span>
        )}

        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs flex items-center space-x-1">
          <MediaIcon className="w-3 h-3" />
          <span className="capitalize">{content.media_type}</span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
          {content.title}
        </h3>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
          {content.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {content.authors && (
              <>
                <img
                  src={content.authors.avatar_url || ''}
                  alt={content.authors.name}
                  className="w-7 h-7 rounded-full border border-gray-200"
                />
                <span className="text-xs text-gray-600">
                  {content.authors.name}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-3 text-gray-500 text-xs">
            <div className="flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{(content.views_count / 1000).toFixed(1)}K</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(content.published_at)}</span>
            </div>
          </div>

          <span className="text-xs text-red-600 hover:text-red-700 transition-colors">
            {content.media_type === 'video' || content.media_type === 'audio' ? 'Play' : 'Read'} →
          </span>
        </div>
      </div>
    </article>
    </Link>
  );
}
