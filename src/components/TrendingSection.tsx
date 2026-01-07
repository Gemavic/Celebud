import { TrendingUp, Play, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaContentWithRelations } from '../lib/database.types';
import { formatDistanceToNow } from '../utils/date';

interface TrendingSectionProps {
  trendingContent: MediaContentWithRelations[];
}

export function TrendingSection({ trendingContent }: TrendingSectionProps) {
  if (trendingContent.length === 0) {
    return null;
  }

  const fallbackImage = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80';

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-rose-500 to-orange-500 p-2.5 rounded-lg">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Trending Now</h2>
          <p className="text-gray-500 text-sm">Popular stories today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {trendingContent.map((content, index) => (
          <Link
            key={content.id}
            to={`/article/${content.id}`}
            className="group relative cursor-pointer block"
          >
            <div className="relative overflow-hidden rounded-2xl shadow-lg">
              <img
                src={content.thumbnail_url || fallbackImage}
                alt={content.title}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = fallbackImage;
                }}
                className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-500"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

              <div className="absolute top-3 left-3 bg-gradient-to-r from-rose-500 to-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm shadow-md">
                {index + 1}
              </div>

              {content.media_type === 'video' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 leading-snug">
                  {content.title}
                </h3>
                <div className="flex items-center justify-between text-white/80 text-xs">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{(content.views_count / 1000).toFixed(0)}K</span>
                  </div>
                  <span>{formatDistanceToNow(content.published_at)}</span>
                </div>
              </div>
            </div>

            <div className="mt-2 px-1">
              {content.categories && (
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: content.categories.color }}
                >
                  {content.categories.name}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
