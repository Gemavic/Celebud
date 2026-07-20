import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useCreators } from '../hooks/useCreators';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  Video,
  DollarSign,
  TrendingUp,
  Clock,
  UserCheck,
  Eye,
  ArrowUpRight,
  AlertCircle,
  PenLine,
  RefreshCw,
  UserPlus,
  CheckCircle,
} from 'lucide-react';

interface Author {
  id: string;
  name: string;
  article_count: number;
}

interface AssignableArticle {
  id: string;
  title: string;
  author_id: string | null;
  published_at: string;
  categories: { name: string } | null;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { canApportionArticles } = usePermissions();
  const { data: creators = [], isLoading: creatorsLoading } = useCreators();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [recentArticles, setRecentArticles] = useState<AssignableArticle[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [articlesLoading, setArticlesLoading] = useState(true);

  const stats = {
    totalCreators: creators.length,
    pendingReview: creators.filter(c => c.status === 'pending').length,
    approvedCreators: creators.filter(c => c.status === 'approved' || c.status === 'onboarded').length,
    totalViews: creators.reduce((sum, c) => sum + Number(c.total_views), 0),
    totalEarnings: creators.reduce((sum, c) => sum + Number(c.total_earnings), 0),
    totalArticles: creators.reduce((sum, c) => sum + c.articles_count, 0),
  };

  const recentPending = creators.filter(c => c.status === 'pending').slice(0, 5);

  useEffect(() => {
    loadAssignmentData();
  }, [user]);

  const loadAssignmentData = async () => {
    setArticlesLoading(true);
    try {
      // Load authors (only safe columns — no user_id to avoid schema cache issues)
      const { data: authorsRaw } = await supabase
        .from('authors')
        .select('id, name')
        .order('name');

      const { data: countData } = await supabase
        .from('media_content')
        .select('author_id')
        .eq('media_type', 'article');

      const countMap: Record<string, number> = {};
      (countData || []).forEach((r: any) => {
        if (r.author_id) countMap[r.author_id] = (countMap[r.author_id] || 0) + 1;
      });

      const authorList: Author[] = (authorsRaw || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        article_count: countMap[a.id] || 0,
      }));
      setAuthors(authorList);

      // Load 8 most recent articles for quick assignment
      const { data: articles } = await supabase
        .from('media_content')
        .select('id, title, author_id, published_at, categories:category_id(name)')
        .eq('media_type', 'article')
        .order('published_at', { ascending: false })
        .limit(8);

      setRecentArticles((articles || []) as AssignableArticle[]);
    } catch (err) {
      console.error('Error loading assignment data:', err);
    } finally {
      setArticlesLoading(false);
    }
  };

  const assignArticle = async (articleId: string, authorId: string) => {
    if (!canApportionArticles) return;
    setAssigningId(articleId);
    try {
      const { error } = await supabase
        .from('media_content')
        .update({ author_id: authorId })
        .eq('id', articleId);
      if (error) throw error;
      setRecentArticles(prev =>
        prev.map(a => a.id === articleId ? { ...a, author_id: authorId } : a)
      );
      setAssignSuccess(articleId);
      setTimeout(() => setAssignSuccess(null), 2000);
    } catch (err) {
      console.error('Assign error:', err);
    } finally {
      setAssigningId(null);
    }
  };

  const authorColor = (name: string) => {
    if (name.includes('Matthew')) return 'bg-blue-100 text-blue-700';
    if (name.includes('Gbenga')) return 'bg-green-100 text-green-700';
    if (name.includes('Victoria')) return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back! Here's your overview.">
      <div className="space-y-8">
        {/* Alert Bar */}
        {stats.pendingReview > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium flex-1">
              You have <span className="font-bold">{stats.pendingReview}</span> creator application{stats.pendingReview > 1 ? 's' : ''} waiting for review.
            </p>
            <Link to="/admin/creators" className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
              Review Now <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard icon={Users} label="Total Creators" value={stats.totalCreators} change="+3 this week" color="blue" />
          <DashboardCard icon={Clock} label="Pending Review" value={stats.pendingReview} color="amber" urgent={stats.pendingReview > 0} />
          <DashboardCard icon={UserCheck} label="Active Creators" value={stats.approvedCreators} color="emerald" />
          <DashboardCard icon={Eye} label="Total Views" value={stats.totalViews.toLocaleString()} color="sky" />
        </div>

        {/* ============================================================
            ARTICLE ASSIGNMENT CENTER — Main Feature
            Only shown to admins whose user_roles row grants
            can_apportion_articles (e.g. hidden for Admin 2 / Victoria).
        ============================================================ */}
        {canApportionArticles && (
        <div className="bg-white rounded-2xl border-2 border-red-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-orange-500 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Article Assignment Center</h2>
              <p className="text-red-100 text-sm mt-0.5">Assign articles & news to writers — track output for remuneration</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin/writers"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <PenLine className="w-4 h-4" />
                Writer's Production
              </Link>
              <Link
                to="/admin/articles"
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                All Articles
              </Link>
            </div>
          </div>

          <div className="p-6">
            {/* Writer Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {authors.map(author => (
                <div key={author.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${authorColor(author.name)}`}>
                      {author.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-none">{author.name.split(' ')[0]}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{author.article_count} articles</p>
                    </div>
                  </div>
                  <Link
                    to="/admin/articles"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Assign <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>

            {/* Recent Articles with inline assignment */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Recent Articles — Click to Reassign Author</h3>
                <button
                  onClick={loadAssignmentData}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              {articlesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {recentArticles.map(article => {
                    const currentAuthor = authors.find(a => a.id === article.author_id);
                    const isSuccess = assignSuccess === article.id;
                    const isAssigning = assigningId === article.id;

                    return (
                      <div
                        key={article.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isSuccess ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Top row: category + title */}
                        <div className="flex items-start gap-2 mb-2">
                          <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                            {article.categories?.name || 'General'}
                          </span>
                          <p className="text-sm text-gray-900 font-medium line-clamp-1 flex-1">
                            {article.title}
                          </p>
                          {isSuccess && (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-700 flex-shrink-0">
                              <CheckCircle className="w-4 h-4" /> Saved!
                            </span>
                          )}
                        </div>

                        {/* Bottom row: current author + assign buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 font-medium">
                            Now: <span className="font-bold text-gray-800">{currentAuthor?.name ?? 'Unassigned'}</span>
                          </span>
                          <span className="text-gray-300 text-xs">→</span>
                          <span className="text-xs text-gray-500">Assign to:</span>
                          {isAssigning ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            authors.map(author => {
                              const isCurrent = article.author_id === author.id;
                              const firstName = author.name.split(' ')[0];
                              const colClass = author.name.includes('Matthew')
                                ? isCurrent ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white'
                                : author.name.includes('Gbenga')
                                ? isCurrent ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-600 hover:text-white'
                                : author.name.includes('Victoria')
                                ? isCurrent ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white'
                                : isCurrent ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-600 hover:text-white';
                              return (
                                <button
                                  key={author.id}
                                  onClick={() => !isCurrent && assignArticle(article.id, author.id)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                                    isCurrent ? 'border-transparent cursor-default' : 'border-transparent cursor-pointer'
                                  } ${colClass}`}
                                  title={isCurrent ? `Currently: ${author.name}` : `Assign to ${author.name}`}
                                >
                                  {isCurrent ? `✓ ${firstName}` : firstName}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Solid colored button = current author. Click any other name to reassign instantly.
                </p>
                <Link
                  to="/admin/articles"
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Manage All Articles
                </Link>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <QuickAction to="/admin/articles" icon={FileText} label="Manage Articles" />
                <QuickAction to="/admin/writers" icon={PenLine} label="Writer's Production" />
                <QuickAction to="/admin/creators" icon={Users} label="Review Creators" badge={stats.pendingReview || undefined} />
                <QuickAction to="/studio" icon={Video} label="Content Studio" />
                <QuickAction to="/admin/metrics" icon={TrendingUp} label="View Analytics" />
                <QuickAction to="/admin/ad-revenue" icon={DollarSign} label="Revenue Report" />
                <QuickAction to="/editorial" icon={FileText} label="Write Article" />
              </div>
            </div>
          </div>

          {/* Pending Applications */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Pending Applications</h3>
                <Link to="/admin/creators" className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1">
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {creatorsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : recentPending.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <UserCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">All caught up!</p>
                  <p className="text-sm text-gray-400 mt-1">No pending applications to review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPending.map(creator => (
                    <div
                      key={creator.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-red-600">
                            {creator.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{creator.display_name}</p>
                          <p className="text-xs text-gray-500">{creator.email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {new Date(creator.created_at).toLocaleDateString()}
                        </span>
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <FileText className="w-8 h-8 opacity-80 mb-3" />
            <p className="text-3xl font-bold">{stats.totalArticles}</p>
            <p className="text-sm text-blue-100 font-medium mt-1">Total Articles Published</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
            <Eye className="w-8 h-8 opacity-80 mb-3" />
            <p className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</p>
            <p className="text-sm text-emerald-100 font-medium mt-1">Total Content Views</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white">
            <DollarSign className="w-8 h-8 opacity-80 mb-3" />
            <p className="text-3xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
            <p className="text-sm text-orange-100 font-medium mt-1">Total Revenue Paid Out</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function DashboardCard({ icon: Icon, label, value, change, color, urgent }: {
  icon: typeof Users;
  label: string;
  value: string | number;
  change?: string;
  color: string;
  urgent?: boolean;
}) {
  const colorStyles: Record<string, { bg: string; icon: string; text: string }> = {
    blue:   { bg: 'bg-blue-50 border-blue-100',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-600' },
    amber:  { bg: 'bg-amber-50 border-amber-100',  icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
    emerald:{ bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-600' },
    sky:    { bg: 'bg-sky-50 border-sky-100',      icon: 'bg-sky-100 text-sky-600',     text: 'text-sky-600' },
  };
  const style = colorStyles[color] || colorStyles.blue;
  return (
    <div className={`rounded-2xl border p-5 ${style.bg} ${urgent ? 'ring-2 ring-amber-300 ring-offset-2' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.icon} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 font-medium mt-0.5">{label}</p>
      {change && <p className={`text-xs ${style.text} font-medium mt-2`}>{change}</p>}
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, badge }: {
  to: string;
  icon: typeof Users;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-gray-500 group-hover:text-red-600 transition-colors" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{badge}</span>
        )}
        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
      </div>
    </Link>
  );
}

export default AdminDashboard;
