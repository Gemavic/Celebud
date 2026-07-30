// src/pages/OriginalsPage.tsx
// CelebUD Originals: the public home for the newsroom's own written work.
//
// Every article here is pinned (media_content.is_pinned), which means the
// nightly trending job cannot un-feature it and no automated pass may rewrite
// it. Articles are only ever removed from this page by an editor unpinning,
// archiving, or deleting them by hand.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { buildArticleUrl } from '../utils/articleUrl';
import { InlineNewsletterCta } from '../components/InlineNewsletterCta';
import { BookOpen, Clock, Pin, Search, X, Eye } from 'lucide-react';

const PAGE_SIZE = 18;

interface OriginalArticle {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string;
  views_count: number | null;
  categories: { name: string; slug: string } | null;
  authors: { name: string } | null;
}

export function OriginalsPage() {
  const [articles, setArticles] = useState<OriginalArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Query only after typing pauses, so we do not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);

    let req = supabase
      .from('media_content')
      .select(
        'id, slug, title, description, thumbnail_url, published_at, views_count, categories(name, slug), authors(name)',
        { count: 'exact' }
      )
      .eq('media_type', 'article')
      .eq('is_pinned', true);

    if (q) {
      // Strip PostgREST delimiters so punctuation in the search box cannot
      // break out of the filter expression.
      const safe = q.replace(/[,()\\]/g, ' ').trim();
      if (safe) req = req.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    const from = p * PAGE_SIZE;
    const { data, count } = await req
      .order('published_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    const rows = (data as unknown as OriginalArticle[]) || [];
    setArticles((prev) => (p === 0 ? rows : [...prev, ...rows]));
    setTotal(count ?? null);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, []);

  useEffect(() => { load(query, page); }, [query, page, load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Pin className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Permanent Collection
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">CelebUD Originals</h1>
            <p className="text-slate-300 max-w-2xl leading-relaxed">
              Our own reporting and expert guides — written in-house, not gathered from
              elsewhere. Insurance, personal finance, immigration and family life,
              explained by people who work in them.
            </p>
            {total !== null && (
              <p className="mt-5 text-sm text-slate-400">
                {total.toLocaleString()} article{total === 1 ? '' : 's'} in the collection
              </p>
            )}
          </div>

          <InlineNewsletterCta source="originals" compact />

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search our guides — life insurance, credit, benefits, parenting…"
              aria-label="Search CelebUD Originals"
              className="w-full pl-12 pr-11 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-slate-700"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading && page === 0 && (
            <p className="text-center text-gray-500 py-12">Loading…</p>
          )}

          {!loading && articles.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {query ? `Nothing found for “${query}”.` : 'No articles pinned to the collection yet.'}
              </p>
              {query && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-3 text-sm font-semibold text-slate-700 hover:text-slate-900"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={buildArticleUrl(a)}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  {a.thumbnail_url ? (
                    <img
                      src={a.thumbnail_url}
                      alt={a.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {a.categories && (
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        {a.categories.name}
                      </span>
                    )}
                    <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" title="Permanent" />
                  </div>
                  <h2 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-slate-700 transition-colors">
                    {a.title}
                  </h2>
                  {a.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(a.published_at).toLocaleDateString()}
                    </span>
                    {(a.views_count ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {(a.views_count ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
