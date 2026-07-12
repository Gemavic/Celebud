import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
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
  MousePointerClick,
  MessageSquare,
  Globe,
  Activity,
  Users,
} from 'lucide-react';

interface ArticleMetric {
  id: string;
  title: string;
  views_count: number;
  comments_count: number;
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

interface RecentActivity {
  activity_type: string;
  article_id: string;
  article_title: string;
  occurred_at: string;
  extra_info: string;
}

interface HourlyView {
  hour_of_day: number;
  view_count: number;
}

interface ReferrerData {
  referrer_source: string;
  visit_count: number;
}

export function MetricsDashboard() {
  const { profile, user, loading: authLoading } = useAuth();
  const { canExecutive, loaded: permsLoaded } = usePermissions();
  const [topArticles, setTopArticles] = useState<ArticleMetric[]>([]);
  const [recentArticles, setRecentArticles] = useState<ArticleMetric[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyViews[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [hourlyViews, setHourlyViews] = useState<HourlyView[]>([]);
  const [referrers, setReferrers] = useState<ReferrerData[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [viewsToday, setViewsToday] = useState(0);
  const [viewsThisWeek, setViewsThisWeek] = useState(0);
  const [adClicks, setAdClicks] = useState({ total: 0, today: 0, week: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'audience' | 'ads'>('overview');

  const fetchMetrics = async () => {
    setRefreshing(true);
    setError(null);

    let results;
    try {
      results = await Promise.all([
      supabase
        .from('media_content')
        .select('id, title, views_count, comments_count, published_at, thumbnail_url, categories(name, color)')
        .order('views_count', { ascending: false })
        .limit(15),

      supabase
        .from('media_content')
        .select('id, title, views_count, comments_count, published_at, thumbnail_url, categories(name, color)')
        .order('published_at', { ascending: false })
        .limit(10),

      supabase.rpc('get_total_views'),

      supabase.from('media_content').select('id', { count: 'exact', head: true }),

      supabase.from('comments').select('id', { count: 'exact', head: true }),

      supabase
        .from('view_events')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),

      supabase
        .from('view_events')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      supabase.rpc('get_daily_views', { days_back: 14 } as any),

      supabase.rpc('get_category_views_breakdown' as any),

      supabase.rpc('get_recent_activity', { activity_limit: 20 } as any),

      supabase.rpc('get_hourly_views', { days_back: 7 } as any),

      supabase.rpc('get_top_referrers', { ref_limit: 10 } as any),

      supabase.rpc('get_ad_click_stats', { days_back: 30 } as any),
      ]);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Could not load analytics — check your connection and try refreshing.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [
      topRes,
      recentRes,
      totalViewsRes,
      totalArticlesRes,
      totalCommentsRes,
      todayEventsRes,
      weekEventsRes,
      dailyRes,
      categoryRes,
      activityRes,
      hourlyRes,
      referrerRes,
      adClickRes,
    ] = results;

    const failedQueries = results.filter((r: any) => r?.error).length;
    if (failedQueries > 0) {
      setError(
        `${failedQueries} of ${results.length} analytics queries failed to load — the numbers below may be incomplete.`
      );
    }

    if (topRes.data) {
      setTopArticles(
        topRes.data.map((a: any) => ({
          id: a.id,
          title: a.title,
          views_count: a.views_count || 0,
          comments_count: a.comments_count || 0,
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
          comments_count: a.comments_count || 0,
          published_at: a.published_at,
          thumbnail_url: a.thumbnail_url,
          category_name: a.categories?.name || 'Uncategorized',
          category_color: a.categories?.color || '#6B7280',
        }))
      );
    }

    if (totalViewsRes.data !== null) setTotalViews(totalViewsRes.data || 0);
    setTotalArticles(totalArticlesRes.count || 0);
    setTotalComments(totalCommentsRes.count || 0);
    setViewsToday(todayEventsRes.count || 0);
    setViewsThisWeek(weekEventsRes.count || 0);

    if (dailyRes.data) setDailyViews(dailyRes.data);
    if (categoryRes.data) setCategoryBreakdown(categoryRes.data);
    if (activityRes.data) setRecentActivity(activityRes.data);
    if (hourlyRes.data) setHourlyViews(hourlyRes.data);
    if (referrerRes.data) setReferrers(referrerRes.data);
    if (adClickRes.data && adClickRes.data.length > 0) {
      const stats = adClickRes.data[0];
      setAdClicks({
        total: stats.total_clicks || 0,
        today: stats.clicks_today || 0,
        week: stats.clicks_this_week || 0,
      });
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!profile?.is_admin) return;
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  const avgViewsPerArticle = useMemo(() => {
    return totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0;
  }, [totalViews, totalArticles]);

  const maxDailyViews = useMemo(() => {
    return Math.max(...dailyViews.map((d) => d.count), 1);
  }, [dailyViews]);

  const maxHourlyViews = useMemo(() => {
    return Math.max(...hourlyViews.map((h) => h.view_count), 1);
  }, [hourlyViews]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 animate-spin text-red-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Admin Access Required</h2>
            <p className="text-gray-500 text-sm mb-6">
              {user
                ? 'Your account does not have admin privileges to view analytics.'
                : 'Please sign in with an admin account to access the analytics dashboard.'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (permsLoaded && !canExecutive) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Executive Access Required</h2>
            <p className="text-gray-500 text-sm mb-6">
              The Analytics Dashboard is restricted to executive-level roles. Contact the CEO or an
              Admin 1 for access.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }


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
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Activity className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Analytics data may be incomplete</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
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
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Monitor your site performance, content engagement, and ad revenue
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

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm">
            {[
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'content', label: 'Content Performance', icon: FileText },
              { key: 'audience', label: 'Audience', icon: Users },
              { key: 'ads', label: 'Ad Performance', icon: MousePointerClick },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                  activeTab === tab.key
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Summary Cards - Always visible */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
              label="This Week"
              value={viewsThisWeek.toLocaleString()}
              color="bg-amber-50 text-amber-600"
            />
            <SummaryCard
              icon={<MessageSquare className="w-5 h-5" />}
              label="Comments"
              value={totalComments.toLocaleString()}
              color="bg-teal-50 text-teal-600"
            />
            <SummaryCard
              icon={<MousePointerClick className="w-5 h-5" />}
              label="Ad Clicks"
              value={adClicks.total.toLocaleString()}
              color="bg-rose-50 text-rose-600"
              subtitle={`${adClicks.today} today`}
            />
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab
              dailyViews={dailyViews}
              maxDailyViews={maxDailyViews}
              recentActivity={recentActivity}
              totalArticles={totalArticles}
              avgViewsPerArticle={avgViewsPerArticle}
            />
          )}

          {activeTab === 'content' && (
            <ContentTab
              topArticles={topArticles}
              recentArticles={recentArticles}
              categoryBreakdown={categoryBreakdown}
            />
          )}

          {activeTab === 'audience' && (
            <AudienceTab
              hourlyViews={hourlyViews}
              maxHourlyViews={maxHourlyViews}
              referrers={referrers}
              recentActivity={recentActivity}
            />
          )}

          {activeTab === 'ads' && (
            <AdsTab adClicks={adClicks} />
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewTab({
  dailyViews,
  maxDailyViews,
  recentActivity,
  totalArticles,
  avgViewsPerArticle,
}: {
  dailyViews: DailyViews[];
  maxDailyViews: number;
  recentActivity: RecentActivity[];
  totalArticles: number;
  avgViewsPerArticle: number;
}) {
  return (
    <div className="space-y-6">
      {/* Daily Views Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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
                    className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t-md transition-all duration-300 hover:from-red-600 hover:to-red-500 cursor-pointer"
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

      {/* Quick Stats + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Articles</span>
              <span className="text-lg font-bold text-gray-900">{totalArticles}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Views / Article</span>
              <span className="text-lg font-bold text-gray-900">{avgViewsPerArticle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Engagement Rate</span>
              <span className="text-lg font-bold text-gray-900">
                {totalArticles > 0 ? ((avgViewsPerArticle / Math.max(totalArticles, 1)) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Live Activity Feed
            </h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.activity_type === 'view' ? 'bg-blue-50' : 'bg-green-50'
                  }`}>
                    {activity.activity_type === 'view' ? (
                      <Eye className="w-4 h-4 text-blue-600" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {activity.activity_type === 'view' ? 'Someone viewed' : 'New comment on'}{' '}
                      <Link to={`/article/${activity.article_id}`} className="font-medium text-red-600 hover:underline">
                        {activity.article_title}
                      </Link>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(activity.occurred_at)}
                      </span>
                      {activity.activity_type === 'view' && activity.extra_info !== 'direct' && (
                        <span className="text-xs text-gray-400 truncate max-w-[200px]">
                          from {activity.extra_info}
                        </span>
                      )}
                      {activity.activity_type === 'comment' && (
                        <span className="text-xs text-gray-500 truncate max-w-[200px] italic">
                          "{activity.extra_info?.slice(0, 60)}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No activity recorded yet. Activity will appear as readers visit and engage.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentTab({
  topArticles,
  recentArticles,
  categoryBreakdown,
}: {
  topArticles: ArticleMetric[];
  recentArticles: ArticleMetric[];
  categoryBreakdown: CategoryBreakdown[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: article.category_color }}
                      />
                      <span className="text-xs text-gray-500">{article.category_name}</span>
                    </span>
                    {article.comments_count > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3" />
                        {article.comments_count}
                      </span>
                    )}
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

        {/* Recent Content */}
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
  );
}

function AudienceTab({
  hourlyViews,
  maxHourlyViews,
  referrers,
  recentActivity,
}: {
  hourlyViews: HourlyView[];
  maxHourlyViews: number;
  referrers: ReferrerData[];
  recentActivity: RecentActivity[];
}) {
  const fullHours = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour_of_day: i,
      view_count: 0,
    }));
    hourlyViews.forEach((h) => {
      hours[h.hour_of_day] = h;
    });
    return hours;
  }, [hourlyViews]);

  const peakHour = useMemo(() => {
    if (hourlyViews.length === 0) return null;
    return hourlyViews.reduce((max, h) => (h.view_count > max.view_count ? h : max), hourlyViews[0]);
  }, [hourlyViews]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Traffic by Hour (Last 7 Days)
          </h2>
          {peakHour && (
            <p className="text-sm text-gray-500 mb-4">
              Peak time: <span className="font-semibold text-gray-700">{formatHour(peakHour.hour_of_day)}</span> with {peakHour.view_count} views
            </p>
          )}
          <div className="flex items-end gap-0.5 h-32">
            {fullHours.map((h) => {
              const height = Math.max((h.view_count / maxHourlyViews) * 100, 2);
              return (
                <div key={h.hour_of_day} className="flex-1 flex flex-col items-center group">
                  <span className="text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 mb-0.5">
                    {h.view_count}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-sm transition-all hover:from-amber-600 hover:to-amber-400 cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`${formatHour(h.hour_of_day)}: ${h.view_count} views`}
                  />
                  {h.hour_of_day % 4 === 0 && (
                    <span className="text-[9px] text-gray-400 mt-0.5">{h.hour_of_day}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Traffic Sources (Last 30 Days)
          </h2>
          {referrers.length > 0 ? (
            <div className="space-y-3">
              {referrers.map((ref, i) => {
                const maxCount = Math.max(...referrers.map((r) => Number(r.visit_count)), 1);
                const width = Math.max((Number(ref.visit_count) / maxCount) * 100, 5);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                        {ref.referrer_source}
                      </span>
                      <span className="text-xs font-semibold text-gray-600">
                        {Number(ref.visit_count).toLocaleString()} visits
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No referrer data yet. Sources will appear as traffic comes in.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Readers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Recent Reader Activity
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Article</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 15).map((activity, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        activity.activity_type === 'view'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {activity.activity_type === 'view' ? (
                          <><Eye className="w-3 h-3" /> View</>
                        ) : (
                          <><MessageSquare className="w-3 h-3" /> Comment</>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/article/${activity.article_id}`}
                        className="text-sm text-gray-900 hover:text-red-600 truncate block max-w-[300px]"
                      >
                        {activity.article_title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 truncate max-w-[200px]">
                      {activity.activity_type === 'view'
                        ? (activity.extra_info || 'Direct')
                        : activity.extra_info?.slice(0, 40) + '...'
                      }
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {formatTimeAgo(activity.occurred_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    No reader activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdsTab({ adClicks }: { adClicks: { total: number; today: number; week: number } }) {
  return (
    <div className="space-y-6">
      {/* Ad Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="inline-flex p-2.5 rounded-lg bg-rose-50 text-rose-600 mb-3">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{adClicks.total.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total Ad Clicks (30 days)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="inline-flex p-2.5 rounded-lg bg-green-50 text-green-600 mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{adClicks.today.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Clicks Today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="inline-flex p-2.5 rounded-lg bg-blue-50 text-blue-600 mb-3">
            <BarChart3 className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{adClicks.week.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">Clicks This Week</p>
        </div>
      </div>

      {/* Ad Performance Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MousePointerClick className="w-5 h-5 text-rose-600" />
          Ad Tracking Active
        </h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 font-medium">Ad click tracking is now active</p>
          <p className="text-sm text-green-700 mt-1">
            All ad clicks on your site are being tracked. Data includes the ad position, page URL,
            referrer source, and timestamp. As your traffic grows, you'll see detailed click analytics here.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">What's Tracked</h4>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Ad position (header, sidebar, article, footer)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Click timestamp
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Traffic source / referrer
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Page where ad was clicked
              </li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Google AdSense</h4>
            <p className="text-sm text-gray-600">
              Google AdSense clicks are handled by Google directly. Their reporting dashboard at{' '}
              <span className="font-medium">adsense.google.com</span>{' '}
              provides detailed revenue and click data for AdSense units.
            </p>
          </div>
        </div>
      </div>
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

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}
