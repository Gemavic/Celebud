import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaContentWithRelations } from '../lib/database.types';
import { formatDistanceToNow } from '../utils/date';
import { buildArticleUrl } from '../utils/articleUrl';

interface TrendingSectionProps {
  trendingContent: MediaContentWithRelations[];
}

export function TrendingSection({ trendingContent }: TrendingSectionProps) {
  if (trendingContent.length === 0) {
    return null;
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-[28px] font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-600" />
            Trending Now
          </h2>
          <p className="text-gray-500 text-sm mt-1">Popular stories today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {trendingContent.slice(0, 6).map((content, index) => (
          <Link
            key={content.id}
            to={buildArticleUrl(content)}
            className="flex gap-3.5 items-start bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
          >
            <span className="font-black text-red-600 text-[26px] leading-none flex-shrink-0" aria-hidden="true">
              {index + 1}
            </span>
            <span className="min-w-0">
              <h4 className="font-bold text-[15px] leading-snug text-gray-900 line-clamp-2">
                {content.title}
              </h4>
              <span className="block text-xs text-gray-400 mt-1.5">
                {content.categories?.name ? `${content.categories.name} · ` : ''}
                {formatDistanceToNow(content.published_at)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
