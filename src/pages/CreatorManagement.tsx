import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import {
  useCreators,
  useCreatorPayouts,
  useUpdateCreatorStatus,
  useCreatePayout,
  useUpdatePayoutStatus,
} from '../hooks/useCreators';
import type { CreatorApplication } from '../hooks/useCreators';
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  DollarSign,
  TrendingUp,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  ArrowLeft,
  Mail,
  Phone,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Globe,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Tab = 'overview' | 'creators' | 'payouts';

export function CreatorManagement() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorApplication | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const { data: creators = [], isLoading: creatorsLoading } = useCreators(statusFilter);
  const { data: payouts = [], isLoading: payoutsLoading } = useCreatorPayouts();
  const updateStatus = useUpdateCreatorStatus();
  const createPayout = useCreatePayout();
  const updatePayoutStatus = useUpdatePayoutStatus();

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-44 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-xl shadow-sm max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to access the Creator Management dashboard.</p>
            <Link to="/" className="inline-flex items-center mt-4 text-red-600 hover:text-red-700 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredCreators = creators.filter(c =>
    c.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: creators.length,
    pending: creators.filter(c => c.status === 'pending').length,
    approved: creators.filter(c => c.status === 'approved').length,
    onboarded: creators.filter(c => c.status === 'onboarded').length,
    rejected: creators.filter(c => c.status === 'rejected').length,
    totalEarnings: creators.reduce((sum, c) => sum + Number(c.total_earnings), 0),
    totalViews: creators.reduce((sum, c) => sum + Number(c.total_views), 0),
    totalArticles: creators.reduce((sum, c) => sum + c.articles_count, 0),
  };

  const pendingPayoutsTotal = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-44 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Creator Management</h1>
                <p className="mt-1 text-gray-500">Track, onboard, and manage content creators and their revenue sharing</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Register Creator
                </button>
                <Link
                  to="/admin/metrics"
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <TrendingUp className="w-4 h-4" />
                  View Metrics
                </Link>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              {([
                { key: 'overview', label: 'Overview', icon: TrendingUp },
                { key: 'creators', label: 'Creators', icon: Users },
                { key: 'payouts', label: 'Payouts', icon: DollarSign },
              ] as { key: Tab; label: string; icon: typeof TrendingUp }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === 'creators' && stats.pending > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      {stats.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <OverviewTab stats={stats} pendingPayoutsTotal={pendingPayoutsTotal} creators={creators} />
              )}
              {activeTab === 'creators' && (
                <CreatorsTab
                  creators={filteredCreators}
                  loading={creatorsLoading}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedCreator={selectedCreator}
                  setSelectedCreator={setSelectedCreator}
                  updateStatus={updateStatus}
                  onCreatePayout={(creator) => {
                    setSelectedCreator(creator);
                    setShowPayoutModal(true);
                  }}
                />
              )}
              {activeTab === 'payouts' && (
                <PayoutsTab
                  payouts={payouts}
                  loading={payoutsLoading}
                  updatePayoutStatus={updatePayoutStatus}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showPayoutModal && selectedCreator && (
        <PayoutModal
          creator={selectedCreator}
          onClose={() => setShowPayoutModal(false)}
          onSubmit={createPayout}
        />
      )}

      {showRegisterModal && (
        <RegisterCreatorModal
          onClose={() => setShowRegisterModal(false)}
        />
      )}
    </div>
  );
}

function OverviewTab({ stats, pendingPayoutsTotal, creators }: {
  stats: { total: number; pending: number; approved: number; onboarded: number; rejected: number; totalEarnings: number; totalViews: number; totalArticles: number };
  pendingPayoutsTotal: number;
  creators: CreatorApplication[];
}) {
  const recentCreators = creators.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Creators" value={stats.total} color="blue" />
        <StatCard icon={Clock} label="Pending Review" value={stats.pending} color="amber" />
        <StatCard icon={UserCheck} label="Active (Onboarded)" value={stats.onboarded} color="emerald" />
        <StatCard icon={DollarSign} label="Pending Payouts" value={`$${pendingPayoutsTotal.toFixed(2)}`} color="red" />
      </div>

      {/* Performance Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Creator Views</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalViews.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Total Articles Published</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.totalArticles}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Total Earnings Paid</p>
              <p className="text-2xl font-bold text-purple-900">${stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Applications</h3>
        {recentCreators.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No creator applications yet</p>
            <p className="text-sm text-gray-400 mt-1">Applications will appear here when creators sign up</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCreators.map(creator => (
              <div key={creator.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600">
                      {creator.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{creator.display_name}</p>
                    <p className="text-sm text-gray-500">{creator.email || 'No email provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={creator.status} />
                  <span className="text-xs text-gray-400">
                    {new Date(creator.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatorsTab({
  creators,
  loading,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  selectedCreator,
  setSelectedCreator,
  updateStatus,
  onCreatePayout,
}: {
  creators: CreatorApplication[];
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedCreator: CreatorApplication | null;
  setSelectedCreator: (c: CreatorApplication | null) => void;
  updateStatus: ReturnType<typeof useUpdateCreatorStatus>;
  onCreatePayout: (c: CreatorApplication) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [shareInput, setShareInput] = useState('');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search creators by name, email, or bio..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="onboarded">Onboarded</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Creators List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading creators...</p>
        </div>
      ) : creators.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No creators found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter !== 'all' ? 'Try changing the filter' : 'Creator applications will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {creators.map(creator => (
            <div
              key={creator.id}
              className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Creator Row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === creator.id ? null : creator.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <span className="text-lg font-bold text-red-600">
                      {creator.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{creator.display_name}</p>
                    <p className="text-sm text-gray-500">{creator.email || 'No email'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {creator.articles_count} articles
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {Number(creator.total_views).toLocaleString()} views
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      ${Number(creator.total_earnings).toFixed(2)}
                    </span>
                  </div>
                  <StatusBadge status={creator.status} />
                  {expandedId === creator.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === creator.id && (
                <div className="border-t border-gray-200 p-5 bg-gray-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left - Info */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Bio</h4>
                        <p className="text-sm text-gray-600">{creator.bio || 'No bio provided'}</p>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {creator.email && (
                          <a href={`mailto:${creator.email}`} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group">
                            <Mail className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                            <span className="text-xs text-gray-700 truncate">{creator.email}</span>
                          </a>
                        )}
                        {creator.phone_number && (
                          <a href={`tel:${creator.phone_number}`} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors group">
                            <Phone className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-500" />
                            <span className="text-xs text-gray-700">{creator.phone_number}</span>
                          </a>
                        )}
                      </div>

                      {/* Social Handles */}
                      {(creator.instagram_handle || creator.twitter_handle || creator.tiktok_handle || creator.youtube_channel || creator.facebook_url) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Social Media</h4>
                          <div className="flex flex-wrap gap-2">
                            {creator.instagram_handle && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 border border-pink-200 text-pink-700 text-xs font-medium rounded-full">
                                <Instagram className="w-3.5 h-3.5" /> @{creator.instagram_handle}
                              </span>
                            )}
                            {creator.twitter_handle && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium rounded-full">
                                <Twitter className="w-3.5 h-3.5" /> @{creator.twitter_handle}
                              </span>
                            )}
                            {creator.tiktok_handle && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium rounded-full">
                                <span className="font-black text-[10px]">TT</span> @{creator.tiktok_handle}
                              </span>
                            )}
                            {creator.youtube_channel && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-full">
                                <Youtube className="w-3.5 h-3.5" /> {creator.youtube_channel}
                              </span>
                            )}
                            {creator.facebook_url && (
                              <a href={creator.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors">
                                <Facebook className="w-3.5 h-3.5" /> Facebook
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {creator.portfolio_url && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Portfolio</h4>
                          <a href={creator.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                            <Globe className="w-3.5 h-3.5" /> {creator.portfolio_url}
                          </a>
                        </div>
                      )}
                      {creator.sample_topics && creator.sample_topics.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Topics</h4>
                          <div className="flex flex-wrap gap-2">
                            {creator.sample_topics.map((topic, i) => (
                              <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500">Revenue Share</p>
                          <p className="text-lg font-bold text-gray-900">{creator.revenue_share_pct}%</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500">Joined</p>
                          <p className="text-sm font-semibold text-gray-900">{new Date(creator.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {creator.last_article_at && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500">Last Article</p>
                          <p className="text-sm font-semibold text-gray-900">{new Date(creator.last_article_at).toLocaleDateString()}</p>
                        </div>
                      )}
                      {creator.admin_notes && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                          <p className="text-xs text-amber-700 font-medium">Admin Notes</p>
                          <p className="text-sm text-amber-800 mt-1">{creator.admin_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Right - Actions */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700">Actions</h4>

                      {/* Status Actions */}
                      <div className="flex flex-wrap gap-2">
                        {creator.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ id: creator.id, status: 'approved' })}
                              disabled={updateStatus.isPending}
                              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: creator.id, status: 'rejected' })}
                              disabled={updateStatus.isPending}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        {creator.status === 'approved' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: creator.id, status: 'onboarded' })}
                            disabled={updateStatus.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            <UserCheck className="w-4 h-4" />
                            Mark as Onboarded
                          </button>
                        )}
                        {(creator.status === 'approved' || creator.status === 'onboarded') && (
                          <button
                            onClick={() => onCreatePayout(creator)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
                          >
                            <DollarSign className="w-4 h-4" />
                            Create Payout
                          </button>
                        )}
                      </div>

                      {/* Revenue Share Update */}
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Adjust Revenue Share %</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            placeholder={String(creator.revenue_share_pct)}
                            value={shareInput}
                            onChange={e => setShareInput(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          />
                          <button
                            onClick={() => {
                              if (shareInput) {
                                updateStatus.mutate({
                                  id: creator.id,
                                  status: creator.status,
                                  revenue_share_pct: Number(shareInput),
                                });
                                setShareInput('');
                              }
                            }}
                            disabled={!shareInput || updateStatus.isPending}
                            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            Update
                          </button>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div>
                        <label className="text-xs text-gray-500 font-medium">Add Admin Note</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            placeholder="Add a note..."
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          />
                          <button
                            onClick={() => {
                              if (noteInput) {
                                updateStatus.mutate({
                                  id: creator.id,
                                  status: creator.status,
                                  admin_notes: noteInput,
                                });
                                setNoteInput('');
                              }
                            }}
                            disabled={!noteInput || updateStatus.isPending}
                            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutsTab({
  payouts,
  loading,
  updatePayoutStatus,
}: {
  payouts: { id: string; creator_id: string; amount: number; period_start: string; period_end: string; status: string; payment_method: string; notes: string | null; created_at: string; paid_at: string | null; creator: { id: string; display_name: string; email: string | null; revenue_share_pct: number } }[];
  loading: boolean;
  updatePayoutStatus: ReturnType<typeof useUpdatePayoutStatus>;
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading payouts...</p>
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No payouts recorded yet</p>
        <p className="text-sm text-gray-400 mt-1">Create payouts from the Creators tab to track payments</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-700 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-900">
            ${payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700 font-medium">Processing</p>
          <p className="text-2xl font-bold text-blue-900">
            ${payouts.filter(p => p.status === 'processing').reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-700 font-medium">Paid</p>
          <p className="text-2xl font-bold text-emerald-900">
            ${payouts.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Creator</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Period</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Method</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payouts.map(payout => (
              <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900">{payout.creator?.display_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{payout.creator?.email || ''}</p>
                </td>
                <td className="py-3 px-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  ${Number(payout.amount).toFixed(2)}
                </td>
                <td className="py-3 px-4 text-center">
                  <PayoutStatusBadge status={payout.status} />
                </td>
                <td className="py-3 px-4 text-center text-gray-600 capitalize">
                  {payout.payment_method?.replace('_', ' ')}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {payout.status === 'pending' && (
                      <button
                        onClick={() => updatePayoutStatus.mutate({ id: payout.id, status: 'processing' })}
                        disabled={updatePayoutStatus.isPending}
                        className="px-2.5 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
                      >
                        Process
                      </button>
                    )}
                    {payout.status === 'processing' && (
                      <button
                        onClick={() => updatePayoutStatus.mutate({ id: payout.id, status: 'paid' })}
                        disabled={updatePayoutStatus.isPending}
                        className="px-2.5 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-md hover:bg-emerald-200 transition-colors disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                    )}
                    {payout.status === 'paid' && payout.paid_at && (
                      <span className="text-xs text-gray-400">
                        Paid {new Date(payout.paid_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayoutModal({ creator, onClose, onSubmit }: {
  creator: CreatorApplication;
  onClose: () => void;
  onSubmit: ReturnType<typeof useCreatePayout>;
}) {
  const [amount, setAmount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !periodStart || !periodEnd) return;

    onSubmit.mutate({
      creator_id: creator.id,
      amount: Number(amount),
      period_start: periodStart,
      period_end: periodEnd,
      payment_method: paymentMethod,
      notes: notes || undefined,
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Create Payout</h3>
        <p className="text-sm text-gray-500 mb-5">
          For <span className="font-semibold">{creator.display_name}</span> ({creator.revenue_share_pct}% rev share)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment reference, notes..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={onSubmit.isPending || !amount || !periodStart || !periodEnd}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {onSubmit.isPending ? 'Creating...' : 'Create Payout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-blue-100 text-blue-700 border-blue-200',
    onboarded: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function RegisterCreatorModal({ onClose }: { onClose: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [topics, setTopics] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState<'approved' | 'onboarded'>('approved');
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [createdId, setCreatedId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('submitting');
    setErrorMsg('');

    const topicsArray = topics ? topics.split(',').map(t => t.trim()).filter(Boolean) : null;
    const cleanEmail = email.trim() || null;
    const now = new Date().toISOString();

    // Check for duplicate email first
    if (cleanEmail) {
      const { data: existing } = await supabase
        .from('creator_applications')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        setStep('error');
        setErrorMsg('A creator with this email already exists. Search for the existing record instead.');
        return;
      }
    }

    // Direct insert — uses admin INSERT RLS policy, no RPC schema cache needed
    const { data, error } = await supabase
      .from('creator_applications')
      .insert({
        display_name: displayName.trim(),
        email: cleanEmail,
        phone_number: phone.trim() || null,
        bio: bio.trim() || null,
        sample_topics: topicsArray,
        instagram_handle: instagram.replace(/^@/, '').trim() || null,
        twitter_handle: twitter.replace(/^@/, '').trim() || null,
        status,
        revenue_share_pct: 50,
        admin_notes: adminNotes.trim() || null,
        reviewed_at: now,
        onboarded_at: status === 'onboarded' ? now : null,
      })
      .select('id')
      .single();

    if (error) {
      setStep('error');
      if (error.message.includes('violates row-level security')) {
        setErrorMsg('Admin access required. Please ensure you are signed in as an admin.');
      } else {
        setErrorMsg('Error: ' + error.message);
      }
      return;
    }

    setCreatedId(data?.id || '');
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Creator Registered!</h3>
          <p className="text-gray-600 text-sm mb-1">
            <span className="font-semibold">{displayName}</span> has been added with status{' '}
            <span className="font-semibold capitalize">{status}</span>.
          </p>
          {email && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-left">
              <p className="text-sm font-semibold text-blue-800 mb-1">Next step — Send this to the creator:</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                "Hi {displayName}, you have been registered on CelebUD as a content creator!
                Please go to celebud.com, create a free account using this email ({email}),
                and our team will link your creator profile so you can start writing and earning."
              </p>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { setStep('form'); setDisplayName(''); setEmail(''); setPhone(''); setBio(''); setTopics(''); setInstagram(''); setTwitter(''); setAdminNotes(''); }}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Register Creator</h3>
              <p className="text-sm text-gray-500 mt-0.5">Admin onboarding — no account required yet</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {step === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Required */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Full Name / Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Victoria Odunola"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="creator@email.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+234 xxx xxx xxxx"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={2}
              placeholder="Short bio about the creator..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Topics (comma-separated)</label>
            <input
              type="text"
              value={topics}
              onChange={e => setTopics(e.target.value)}
              placeholder="Celebrity, Sports, Entertainment"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="@handle"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">X / Twitter</label>
              <input
                type="text"
                value={twitter}
                onChange={e => setTwitter(e.target.value)}
                placeholder="@handle"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Status</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="approved"
                  checked={status === 'approved'}
                  onChange={() => setStatus('approved')}
                  className="accent-red-600"
                />
                <span className="text-sm text-gray-700">Approved <span className="text-xs text-gray-400">(needs onboarding)</span></span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="onboarded"
                  checked={status === 'onboarded'}
                  onChange={() => setStatus('onboarded')}
                  className="accent-red-600"
                />
                <span className="text-sm text-gray-700">Onboarded <span className="text-xs text-gray-400">(fully active)</span></span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes</label>
            <input
              type="text"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="e.g. Referred by Gbenga, specialises in politics..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={step === 'submitting' || !displayName.trim()}
              className="flex-1 py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {step === 'submitting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register Creator
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatorManagement;
