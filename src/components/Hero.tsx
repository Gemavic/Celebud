import { Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaContentWithRelations } from '../lib/database.types';
import { formatDistanceToNow } from '../utils/date';

interface HeroProps {
  featuredContent: MediaContentWithRelations[];
}

export function Hero({ featuredContent }: HeroProps) {
  if (!featuredContent || featuredContent.length === 0) {
    return null;
  }

  const mainFeatured = featuredContent[0];
  const sideFeatured = featuredContent.length > 1 ? featuredContent.slice(1, 3) : [];

  return (
    <section className="pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link to={`/article/${mainFeatured.id}`} className="lg:col-span-2 relative group cursor-pointer overflow-hidden rounded-3xl shadow-2xl block">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />

          <img
            src={mainFeatured.thumbnail_url || ''}
            alt={mainFeatured.title}
            loading="eager"
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

          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <h2 className="text-2xl font-medium text-white mb-3 leading-tight line-clamp-2">
              {mainFeatured.title}
            </h2>

            <div className="flex items-center space-x-3 text-gray-300 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(mainFeatured.published_at)}</span>
            </div>
          </div>
        </Link>

        <div className="space-y-6">
          {sideFeatured.length > 0 && sideFeatured.map((content) => (
            <Link
              key={content.id}
              to={`/article/${content.id}`}
              className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-xl h-[242px] block"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

              <img
                src={content.thumbnail_url || ''}
                alt={content.title}
                loading="lazy"
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

              <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="text-base font-medium text-white line-clamp-2 leading-snug">
                  {content.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
