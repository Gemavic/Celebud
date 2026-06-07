import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import {
  BarChart3,
  Eye,
  TrendingUp,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowLeft,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface ArticleMetric {
  id: string;
  title: string;
  views_count: number;
  published_at: string;
  category_name: string;
  category_color: string;
  thumbnail_url: string | null;
}

interface DailyViews {
  date: string;
  count: number;
}

interface CategoryBreakdown {
  name: string;
  color: string;
  views: number;
  articles: number;
}

export function MetricsDashboard() {
  const [topArticles, setTopArticles] = useState<ArticleMetric[]>([]);
  const [recentArticles, setRecentArticles] = useState<ArticleMetric[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyViews[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [viewsToday, setViewsToday] = useState(0);
  const [viewsThisWeek, setViewsThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setRefreshing(true);

    const [
      topRes,
      recentRes,
      totalViewsRes,
      totalArticlesRes,
      todayEventsRes,
      weekEventsRes,
      dailyRes,
      categoryRes,
    ] = await Promise.all([
      // Top 15 most viewed articles
      supabase
        .from('media_content')
        .select('id, title, views_count, published_at, thumbnail_url, categories(name, color)')
        .order('views_count', { ascending: false })
        .limit(15),

      // Most recent articles by views
      supabase
        .from('media_content')
        .select('id, title, views_count, published_at, thumbnail_url, categories(name, color)')
        .order('published_at', { ascending: false })
        .limit(10),

      // Total views sum
      supabase.rpc('get_total_views'),

      // Total articles count
      supabase.from('media_content').select('id', { count: 'exact', head: true }),

      // Views today
      supabase
        .from('view_events')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

      // Views this week
      supabase
        .from('view_events')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Daily views for last 14 days
      supabase.rpc('get_daily_views', { days_back: 14 }),

      // Category breakdown
      supabase.rpc('get_category_views_breakdown'),
    ]);

    if (topRes.data) {
      setTopArticles(
        topRes.data.map((a: any) => ({
          id: a.id,
          title: a.title,
          views_count: a.views_count || 0,
          published_at: a.published_at,
          thumbnail_url: a.thumbnail_url,
          category_name: a.categories?.name || 'Uncategorized',
          category_color: a.categories?.color || '#6B7280',
        }))
      );
    }

    if (recentRes.data) {
      setRecentArticles(
        recentRes.data.map((a: any) => ({
          id: a.id,
          title: a.title,
          views_count: a.views_count || 0,
          published_at: a.published_at,
          thumbnail_url: a.thumbnail_url,
          category_name: a.categories?.name || 'Uncategorized',
          category_color: a.categories?.color || '#6B7280',
        }))
      );
    }

    if (totalViewsRes.data !== null) {
      setTotalViews(totalViewsRes.data || 0);
    }

    setTotalArticles(totalArticlesRes.count || 0);
    setViewsToday(todayEventsRes.count || 0);
    setViewsThisWeek(weekEventsRes.count || 0);

    if (dailyRes.data) {
      setDailyViews(dailyRes.data);
    }

    if (categoryRes.data) {
      setCategoryBreakdown(categoryRes.data);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const avgViewsPerArticle = useMemo(() => {
    return totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0;
  }, [totalViews, totalArticles]);

  const maxDailyViews = useMemo(() => {
    return Math.max(...dailyViews.map((d) => d.count), 1);
  }, [dailyViews]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 animate-spin text-red-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-7 h-7 text-red-600" />
                  Content Metrics
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Real-time views and engagement analytics
                </p>
              </div>
            </div>
            <button
              onClick={fetchMetrics}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              icon={<Eye className="w-5 h-5" />}
              label="Total Views"
              value={totalViews.toLocaleString()}
              color="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              icon={<Clock className="w-5 h-5" />}
              label="Views Today"
              value={viewsToday.toLocaleString()}
              color="bg-green-50 text-green-600"
            />
            <SummaryCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Views This Week"
              value={viewsThisWeek.toLocaleString()}
              color="bg-amber-50 text-amber-600"
            />
            <SummaryCard
              icon={<FileText className="w-5 h-5" />}
              label="Avg Views / Article"
              value={avgViewsPerArticle.toLocaleString()}
              color="bg-red-50 text-red-600"
              subtitle={`${totalArticles} articles`}
            />
          </div>

          {/* Views Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Daily Views (Last 14 Days)
            </h2>
            {dailyViews.length > 0 ? (
              <div className="flex items-end gap-1.5 h-48">
                {dailyViews.map((day) => {
                  const height = Math.max((day.count / maxDailyViews) * 100, 2);
                  const date = new Date(day.date);
                  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        {day.count}
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t-md transition-all duration-300 hover:from-red-600 hover:to-red-500 cursor-pointer relative"
                        style={{ height: `${height}%` }}
                        title={`${label}: ${day.count} views`}
                      />
                      <span className="text-[10px] text-gray-400 truncate w-full text-center">
                        {date.toLocaleDateString('en-US', { day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">
                <p>No view data yet. Views will appear here as readers visit articles.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Top Articles */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                    Most Viewed Articles
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {topArticles.map((article, index) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
                    >
                      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 flex-shrink-0">
                        {index + 1}
                      </span>
                      {article.thumbnail_url && (
                        <img
                          src={article.thumbnail_url}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-red-600 transition-colors">
                          {article.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: article.category_color }}
                          />
                          <span className="text-xs text-gray-500">{article.category_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 flex-shrink-0">
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">
                          {article.views_count.toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {topArticles.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                      No articles with views yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Views by Category
                </h2>
                <div className="space-y-3">
                  {categoryBreakdown.length > 0 ? (
                    categoryBreakdown.map((cat) => {
                      const maxViews = Math.max(...categoryBreakdown.map((c) => c.views), 1);
                      const width = Math.max((cat.views / maxViews) * 100, 3);
                      return (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                            <span className="text-xs text-gray-500">
                              {cat.views} views / {cat.articles} articles
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${width}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-400">No category data yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Content Performance */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Recent Content
                </h2>
                <div className="space-y-3">
                  {recentArticles.map((article) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.id}`}
                      className="flex items-center justify-between group"
                    >
                      <p className="text-sm text-gray-700 truncate flex-1 mr-3 group-hover:text-red-600 transition-colors">
                        {article.title}
                      </p>
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1 flex-shrink-0">
                        <Eye className="w-3 h-3" />
                        {article.views_count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className={`inline-flex p-2.5 rounded-lg ${color} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
