import { AdminLayout } from '../components/AdminLayout';
import { useCreators } from '../hooks/useCreators';
import { useContentStats } from '../hooks/useCreatorContent';
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
} from 'lucide-react';

export function AdminDashboard() {
  const { data: creators = [], isLoading: creatorsLoading } = useCreators();

  const stats = {
    totalCreators: creators.length,
    pendingReview: creators.filter(c => c.status === 'pending').length,
    approvedCreators: creators.filter(c => c.status === 'approved' || c.status === 'onboarded').length,
    totalViews: creators.reduce((sum, c) => sum + Number(c.total_views), 0),
    totalEarnings: creators.reduce((sum, c) => sum + Number(c.total_earnings), 0),
    totalArticles: creators.reduce((sum, c) => sum + c.articles_count, 0),
  };

  const recentPending = creators.filter(c => c.status === 'pending').slice(0, 5);

  return (
    <AdminLayout title="Dashboard" subtitle="Welcome back! Here's your overview.">
      <div className="space-y-8">
        {/* Alert Bar - Pending Reviews */}
        {stats.pendingReview > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium flex-1">
              You have <span className="font-bold">{stats.pendingReview}</span> creator application{stats.pendingReview > 1 ? 's' : ''} waiting for review.
            </p>
            <Link
              to="/admin/creators"
              className="text-sm font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
            >
              Review Now <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <DashboardCard
            icon={Users}
            label="Total Creators"
            value={stats.totalCreators}
            change="+3 this week"
            color="blue"
          />
          <DashboardCard
            icon={Clock}
            label="Pending Review"
            value={stats.pendingReview}
            color="amber"
            urgent={stats.pendingReview > 0}
          />
          <DashboardCard
            icon={UserCheck}
            label="Active Creators"
            value={stats.approvedCreators}
            color="emerald"
          />
          <DashboardCard
            icon={Eye}
            label="Total Views"
            value={stats.totalViews.toLocaleString()}
            color="sky"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <QuickAction to="/admin/creators" icon={Users} label="Review Creators" badge={stats.pendingReview || undefined} />
                <QuickAction to="/admin/articles" icon={FileText} label="Manage Articles" />
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
    blue: { bg: 'bg-blue-50 border-blue-100', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-600' },
    amber: { bg: 'bg-amber-50 border-amber-100', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-600' },
    sky: { bg: 'bg-sky-50 border-sky-100', icon: 'bg-sky-100 text-sky-600', text: 'text-sky-600' },
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
        <Icon className="w-4.5 h-4.5 text-gray-500 group-hover:text-red-600 transition-colors" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            {badge}
          </span>
        )}
        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
      </div>
    </Link>
  );
}

export default AdminDashboard;
