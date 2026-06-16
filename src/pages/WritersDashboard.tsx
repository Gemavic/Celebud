import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AdminLayout } from '../components/AdminLayout';
import { formatDistanceToNow } from '../utils/date';
import {
  FileText,
  Eye,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Award,
  BarChart3,
} from 'lucide-react';

interface AuthorStats {
  id: string;
  name: string;
  avatar_url: string | null;
  article_count: number;
  total_views: number;
  total_comments: number;
  latest_article_date: string | null;
  articles: ArticleRow[];
  expanded: boolean;
}

interface ArticleRow {
  id: string;
  title: string;
  views_count: number;
  comments_count: number;
  published_at: string;
  author_id: string | null;
  categories: { name: string } | null;
}

export function WritersDashboard() {
  const { profile } = useAuth();
  const [authorStats, setAuthorStats] = useState<AuthorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [filterAuthor, setFilterAuthor] = useState<string>('all');

  useEffect(() => {
    if (profile?.is_admin) fetchWriterStats();
  }, [profile]);

  const fetchWriterStats = async () => {
    setLoading(true);
    try {
      const { data: authors, error: authErr } = await supabase
        .from('authors')
        .select('id, name, avatar_url')
        .order('name');

      if (authErr) throw authErr;

      const { data: articles, error: artErr } = await supabase
        .from('media_content')
        .select(`
          id, title, author_id, views_count, comments_count,
          published_at,
          categories:category_id (name)
        `)
        .eq('media_type', 'article')
        .order('published_at', { ascending: false });

      if (artErr) throw artErr;

      const allArticles: ArticleRow[] = (articles || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        author_id: a.author_id,
        views_count: a.views_count || 0,
        comments_count: a.comments_count || 0,
        published_at: a.published_at,
        categories: a.categories,
      }));

      const stats: AuthorStats[] = (authors || []).map((author) => {
        const mine = allArticles.filter((a) => a.author_id === author.id);
        return {
          id: author.id,
          name: author.name,
          avatar_url: author.avatar_url,
          article_count: mine.length,
          total_views: mine.reduce((s, a) => s + a.views_count, 0),
          total_comments: mine.reduce((s, a) => s + a.comments_count, 0),
          latest_article_date: mine[0]?.published_at || null,
          articles: mine,
          expanded: false,
        };
      });

      // Sort by article count descending
      stats.sort((a, b) => b.article_count - a.article_count);

      setAuthorStats(stats);
      setTotalArticles(allArticles.length);
      setTotalViews(allArticles.reduce((s, a) => s + a.views_count, 0));
    } catch (err) {
      console.error('Error fetching writer stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (authorId: string) => {
    setAuthorStats((prev) =>
      prev.map((a) => (a.id === authorId ? { ...a, expanded: !a.expanded } : a))
    );
  };

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const displayed = filterAuthor === 'all'
    ? authorStats
    : authorStats.filter((a) => a.id === filterAuthor);

  if (!profile?.is_admin) return null;

  return (
    <AdminLayout title="Writer's Production" subtitle="Track articles, views, and output per writer for remuneration">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Total Articles</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalArticles.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Total Views</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalViews.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Active Writers</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {authorStats.filter((a) => a.article_count > 0).length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Top Writer</span>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate">
                {authorStats[0]?.name || '—'}
              </p>
              <p className="text-sm text-gray-500">{authorStats[0]?.article_count || 0} articles</p>
            </div>
          </div>

          {/* Filter + Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <select
                value={filterAuthor}
                onChange={(e) => setFilterAuthor(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Writers</option>
                {authorStats.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.article_count})</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchWriterStats}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors ml-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Writer Cards */}
          <div className="space-y-4">
            {displayed.map((author, index) => (
              <div key={author.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header Row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(author.id)}
                >
                  {/* Rank badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    #{index + 1}
                  </div>

                  {/* Avatar */}
                  {author.avatar_url ? (
                    <img
                      src={author.avatar_url}
                      alt={author.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">{initials(author.name)}</span>
                    </div>
                  )}

                  {/* Name + last active */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{author.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {author.latest_article_date
                        ? `Last article ${formatDistanceToNow(author.latest_article_date)}`
                        : 'No articles yet'}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{author.article_count}</p>
                      <p className="text-gray-500 text-xs">Articles</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{author.total_views.toLocaleString()}</p>
                      <p className="text-gray-500 text-xs">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{author.total_comments}</p>
                      <p className="text-gray-500 text-xs">Comments</p>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <div className="ml-2 text-gray-400">
                    {author.expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Mobile stats strip */}
                <div className="sm:hidden flex border-t border-gray-100 divide-x divide-gray-100">
                  <div className="flex-1 py-2 text-center">
                    <p className="font-bold text-gray-900 text-sm">{author.article_count}</p>
                    <p className="text-gray-500 text-xs">Articles</p>
                  </div>
                  <div className="flex-1 py-2 text-center">
                    <p className="font-bold text-gray-900 text-sm">{author.total_views.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">Views</p>
                  </div>
                  <div className="flex-1 py-2 text-center">
                    <p className="font-bold text-gray-900 text-sm">{author.total_comments}</p>
                    <p className="text-gray-500 text-xs">Comments</p>
                  </div>
                </div>

                {/* Expanded Article List */}
                {author.expanded && (
                  <div className="border-t border-gray-100">
                    {author.articles.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">
                        No articles attributed to this writer yet.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-5 py-2.5 font-semibold text-gray-600 w-full">Article</th>
                            <th className="px-5 py-2.5 font-semibold text-gray-600 whitespace-nowrap hidden md:table-cell">Category</th>
                            <th className="px-5 py-2.5 font-semibold text-gray-600 whitespace-nowrap">
                              <Eye className="w-4 h-4 inline" />
                            </th>
                            <th className="px-5 py-2.5 font-semibold text-gray-600 whitespace-nowrap hidden sm:table-cell">
                              <MessageSquare className="w-4 h-4 inline" />
                            </th>
                            <th className="px-5 py-2.5 font-semibold text-gray-600 whitespace-nowrap hidden lg:table-cell">
                              <Calendar className="w-4 h-4 inline" />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {author.articles.map((article) => (
                            <tr key={article.id} className="hover:bg-gray-50">
                              <td className="px-5 py-3">
                                <span className="text-gray-800 line-clamp-2">{article.title}</span>
                              </td>
                              <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">
                                {article.categories?.name || '—'}
                              </td>
                              <td className="px-5 py-3 text-gray-700 font-medium whitespace-nowrap">
                                {article.views_count.toLocaleString()}
                              </td>
                              <td className="px-5 py-3 text-gray-500 whitespace-nowrap hidden sm:table-cell">
                                {article.comments_count}
                              </td>
                              <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap hidden lg:table-cell">
                                {formatDistanceToNow(article.published_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-semibold text-sm">
                            <td className="px-5 py-2.5 text-gray-700">
                              Total — {author.article_count} article{author.article_count !== 1 ? 's' : ''}
                            </td>
                            <td className="hidden md:table-cell" />
                            <td className="px-5 py-2.5 text-gray-700">{author.total_views.toLocaleString()}</td>
                            <td className="px-5 py-2.5 text-gray-500 hidden sm:table-cell">{author.total_comments}</td>
                            <td className="hidden lg:table-cell" />
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Remuneration Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">For Remuneration Purposes</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Every article credited to a writer counts toward their production total.
              Use the Article Management page to assign or update authorship on any article —
              each article has an <strong>Assign to me</strong> button for quick crediting.
            </p>
            </div>
          </div>

        </div>
      )}
    </AdminLayout>
  );
}
