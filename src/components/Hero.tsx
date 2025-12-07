import { Play, Clock, Eye, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaContentWithRelations } from '../lib/database.types';
import { formatDistanceToNow } from '../utils/date';

interface HeroProps {
  featuredContent: MediaContentWithRelations[];
}

export function Hero({ featuredContent }: HeroProps) {
  const mainFeatured = featuredContent[0];
  const sideFeatured = featuredContent.slice(1, 3);

  if (!mainFeatured) {
    return null;
  }

  return (
    <section className="pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link to={`/article/${mainFeatured.id}`} className="lg:col-span-2 relative group cursor-pointer overflow-hidden rounded-3xl shadow-2xl block">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />

          <img
            src={mainFeatured.thumbnail_url || ''}
            alt={mainFeatured.title}
            className="w-full h-[500px] object-cover transform group-hover:scale-105 transition-transform duration-700"
          />

          <div className="absolute top-6 left-6 z-20 flex items-center space-x-2">
            <span className="bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>Featured</span>
            </span>
            {mainFeatured.categories && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: mainFeatured.categories.color }}
              >
                {mainFeatured.categories.name}
              </span>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
            <h2 className="text-3xl font-semibold text-white mb-3 leading-tight">
              {mainFeatured.title}
            </h2>
            <p className="text-gray-200 text-base mb-5 line-clamp-2 leading-relaxed">
              {mainFeatured.description}
            </p>

            <div className="flex items-center space-x-5 text-gray-300 text-sm mb-5">
              {mainFeatured.authors && (
                <div className="flex items-center space-x-2">
                  <img
                    src={mainFeatured.authors.avatar_url || ''}
                    alt={mainFeatured.authors.name}
                    className="w-7 h-7 rounded-full border border-white"
                  />
                  <span className="text-sm">{mainFeatured.authors.name}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm">{formatDistanceToNow(mainFeatured.published_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5" />
                <span className="text-sm">{mainFeatured.views_count.toLocaleString()} views</span>
              </div>
            </div>

            <button className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2 shadow-lg text-sm">
              {mainFeatured.media_type === 'video' || mainFeatured.media_type === 'audio' ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Play Now</span>
                </>
              ) : (
                <span>Read Article</span>
              )}
            </button>
          </div>
        </Link>

        <div className="space-y-6">
          {sideFeatured.map((content) => (
            <Link
              key={content.id}
              to={`/article/${content.id}`}
              className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-xl h-[242px] block"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

              <img
                src={content.thumbnail_url || ''}
                alt={content.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              />

              {content.categories && (
                <span
                  className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: content.categories.color }}
                >
                  {content.categories.name}
                </span>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 leading-snug">
                  {content.title}
                </h3>
                <div className="flex items-center space-x-3 text-gray-300 text-xs">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{(content.views_count / 1000).toFixed(1)}K</span>
                  </div>
                  <span>{formatDistanceToNow(content.published_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
