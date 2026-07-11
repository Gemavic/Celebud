import { Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaContentWithRelations } from '../lib/database.types';
import { formatDistanceToNow } from '../utils/date';
import { buildArticleUrl } from '../utils/articleUrl';

interface HeroProps {
  featuredContent: MediaContentWithRelations[];
}

export function Hero({ featuredContent }: HeroProps) {
  if (!featuredContent || featuredContent.length === 0) {
    return null;
  }

  const mainFeatured = featuredContent[0];
  const sideFeatured = featuredContent.length > 1 ? featuredContent.slice(1, 3) : [];
  const fallbackImage = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80';

  return (
    <section className="pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link to={buildArticleUrl(mainFeatured)} className="lg:col-span-2 relative group cursor-pointer overflow-hidden rounded-3xl shadow-2xl block">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />

          <img
            src={mainFeatured.thumbnail_url || fallbackImage}
            alt={mainFeatured.title}
            loading="eager"
            fetchPriority="high"
            width={800}
            height={500}
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = fallbackImage;
            }}
            className="w-full h-[500px] object-cover transform group-hover:scale-105 transition-transform duration-700"
          />

          <div className="absolute top-5 left-5 z-20 flex items-center gap-2">
            <span className="bg-red-600 text-white px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Featured</span>
            </span>
            {mainFeatured.categories && (
              <span className="px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wide bg-white/95 text-gray-900">
                {mainFeatured.categories.name}
              </span>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-20">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3 leading-[1.15] line-clamp-3">
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
              to={buildArticleUrl(content)}
              className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-xl h-[242px] block"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

              <img
                src={content.thumbnail_url || fallbackImage}
                alt={content.title}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = fallbackImage;
                }}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              />

              {content.categories && (
                <span className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wide bg-white/95 text-gray-900">
                  {content.categories.name}
                </span>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="text-lg font-bold tracking-tight text-white line-clamp-2 leading-snug">
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
