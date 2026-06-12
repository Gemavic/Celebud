import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import {
  useCreatorContentList,
  useContentCategories,
  useCreateContent,
  useUpdateContent,
  useDeleteContent,
  useContentStats,
} from '../hooks/useCreatorContent';
import type { ContentType, ContentStatus, Platform, CreatorContentItem } from '../hooks/useCreatorContent';
import { useCreators } from '../hooks/useCreators';
import { Video, Radio, Scissors, Share2, Plus, Eye, Heart, MessageSquare, TrendingUp, Calendar, Clock, Filter, Search, MoreVertical, CreditCard as Edit3, Trash2, ExternalLink, Upload, Play, Tv, ArrowLeft, CheckCircle, AlertCircle, X, Globe, Hash, Image, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

type StudioTab = 'overview' | 'videos' | 'livestreams' | 'clips' | 'social';

const CONTENT_TYPE_MAP: Record<StudioTab, ContentType | null> = {
  overview: null,
  videos: 'video',
  livestreams: 'livestream',
  clips: 'clip',
  social: 'social_post',
};

const TAB_CONFIG: { key: StudioTab; label: string; icon: typeof Video; color: string }[] = [
  { key: 'overview', label: 'Overview', icon: TrendingUp, color: 'text-gray-700' },
  { key: 'videos', label: 'Videos', icon: Video, color: 'text-blue-600' },
  { key: 'livestreams', label: 'Live Streams', icon: Radio, color: 'text-red-600' },
  { key: 'clips', label: 'Short Clips', icon: Scissors, color: 'text-teal-600' },
  { key: 'social', label: 'Social Posts', icon: Share2, color: 'text-orange-600' },
];

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'custom', label: 'Custom/Direct' },
];

export function ContentStudio() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<StudioTab>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<ContentType>('video');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<CreatorContentItem | null>(null);

  const { data: creators = [] } = useCreators();
  const myCreator = creators.find(c => c.user_id === user?.id);

  const contentType = CONTENT_TYPE_MAP[activeTab];
  const { data: contentItems = [], isLoading } = useCreatorContentList(
    myCreator?.id,
    {
      contentType: contentType || undefined,
      status: statusFilter !== 'all' ? statusFilter as ContentStatus : undefined,
    }
  );
  const { data: stats } = useContentStats(myCreator?.id);
  const { data: categories = [] } = useContentCategories();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-44 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-md">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-600">Please sign in to access the Creator Content Studio.</p>
            <Link to="/" className="inline-flex items-center mt-4 text-red-600 hover:text-red-700 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!myCreator || !['approved', 'onboarded'].includes(myCreator.status)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-44 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-md">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Creator Access Required</h2>
            <p className="text-gray-600">
              {myCreator?.status === 'pending'
                ? 'Your creator application is pending review. You\'ll get access once approved.'
                : 'You need to be an approved creator to access the Content Studio.'}
            </p>
            <Link to="/" className="inline-flex items-center mt-4 text-red-600 hover:text-red-700 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredItems = contentItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleNewContent = (type: ContentType) => {
    setUploadType(type);
    setEditingItem(null);
    setShowUploadModal(true);
  };

  const handleEdit = (item: CreatorContentItem) => {
    setEditingItem(item);
    setUploadType(item.content_type);
    setShowUploadModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-44 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Content Studio</h1>
                <p className="mt-1 text-gray-500">
                  Upload and manage your videos, live streams, clips, and social content
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/admin/creators"
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Creators
                </Link>
                <button
                  onClick={() => handleNewContent(contentType || 'video')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 hover:shadow-red-300"
                >
                  <Plus className="w-5 h-5" />
                  New Content
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-hide">
              {TAB_CONFIG.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.key
                      ? 'border-red-600 text-red-600 bg-red-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key !== 'overview' && stats && (
                    <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                      activeTab === tab.key ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.key === 'videos' && stats.videos}
                      {tab.key === 'livestreams' && stats.livestreams}
                      {tab.key === 'clips' && stats.clips}
                      {tab.key === 'social' && stats.socialPosts}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'overview' ? (
                <OverviewPanel stats={stats} onNavigate={setActiveTab} onNewContent={handleNewContent} />
              ) : (
                <ContentPanel
                  items={filteredItems}
                  loading={isLoading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  onEdit={handleEdit}
                  onNewContent={() => handleNewContent(contentType!)}
                  contentType={contentType!}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showUploadModal && myCreator && (
        <ContentUploadModal
          creatorId={myCreator.id}
          contentType={uploadType}
          categories={categories}
          editingItem={editingItem}
          onClose={() => {
            setShowUploadModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function OverviewPanel({
  stats,
  onNavigate,
  onNewContent,
}: {
  stats: ReturnType<typeof useContentStats>['data'];
  onNavigate: (tab: StudioTab) => void;
  onNewContent: (type: ContentType) => void;
}) {
  const quickActions = [
    { type: 'video' as ContentType, label: 'Upload Video', icon: Video, color: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50 border-blue-100' },
    { type: 'livestream' as ContentType, label: 'Schedule Stream', icon: Radio, color: 'from-red-500 to-red-600', bgLight: 'bg-red-50 border-red-100' },
    { type: 'clip' as ContentType, label: 'Post Clip', icon: Scissors, color: 'from-teal-500 to-teal-600', bgLight: 'bg-teal-50 border-teal-100' },
    { type: 'social_post' as ContentType, label: 'Share Social Post', icon: Share2, color: 'from-orange-500 to-orange-600', bgLight: 'bg-orange-50 border-orange-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(action => (
            <button
              key={action.type}
              onClick={() => onNewContent(action.type)}
              className={`group relative overflow-hidden rounded-xl border p-5 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${action.bgLight}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-gray-900">{action.label}</p>
              <p className="text-sm text-gray-500 mt-1">Click to get started</p>
              <Plus className="absolute top-4 right-4 w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatTile label="Total Content" value={stats.total} icon={Tv} color="bg-gray-100 text-gray-700" />
            <StatTile label="Published" value={stats.published} icon={CheckCircle} color="bg-emerald-100 text-emerald-700" />
            <StatTile label="Drafts" value={stats.drafts} icon={Edit3} color="bg-amber-100 text-amber-700" />
            <StatTile label="Total Views" value={stats.totalViews.toLocaleString()} icon={Eye} color="bg-blue-100 text-blue-700" />
            <StatTile label="Total Likes" value={stats.totalLikes.toLocaleString()} icon={Heart} color="bg-red-100 text-red-700" />
            <StatTile label="Total Shares" value={stats.totalShares.toLocaleString()} icon={Share2} color="bg-teal-100 text-teal-700" />
          </div>
        </div>
      )}

      {/* Content Breakdown */}
      {stats && stats.total > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Content Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ContentTypeCard
              icon={Video}
              label="Videos"
              count={stats.videos}
              color="blue"
              onClick={() => onNavigate('videos')}
            />
            <ContentTypeCard
              icon={Radio}
              label="Live Streams"
              count={stats.livestreams}
              color="red"
              onClick={() => onNavigate('livestreams')}
            />
            <ContentTypeCard
              icon={Scissors}
              label="Short Clips"
              count={stats.clips}
              color="teal"
              onClick={() => onNavigate('clips')}
            />
            <ContentTypeCard
              icon={Share2}
              label="Social Posts"
              count={stats.socialPosts}
              color="orange"
              onClick={() => onNavigate('social')}
            />
          </div>
        </div>
      )}

      {(!stats || stats.total === 0) && (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-dashed border-gray-300">
          <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">Start Creating</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Upload your first video, schedule a live stream, or share a clip to get started with your content journey.
          </p>
        </div>
      )}
    </div>
  );
}

function ContentPanel({
  items,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onEdit,
  onNewContent,
  contentType,
}: {
  items: CreatorContentItem[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onEdit: (item: CreatorContentItem) => void;
  onNewContent: () => void;
  contentType: ContentType;
}) {
  const deleteContent = useDeleteContent();
  const updateContent = useUpdateContent();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const typeLabels: Record<ContentType, string> = {
    video: 'Videos',
    livestream: 'Live Streams',
    clip: 'Short Clips',
    social_post: 'Social Posts',
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Search ${typeLabels[contentType].toLowerCase()}...`}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live Now</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button
            onClick={onNewContent}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading content...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-dashed border-gray-300">
          <Upload className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No {typeLabels[contentType]} Yet</h3>
          <p className="text-gray-500 mb-5">Upload your first content to get started.</p>
          <button
            onClick={onNewContent}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create {typeLabels[contentType].slice(0, -1)}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map(item => (
            <div
              key={item.id}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ContentTypeIcon type={item.content_type} className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <ContentStatusBadge status={item.status} />
                </div>
                {/* Duration */}
                {item.duration_seconds && (
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-xs font-semibold rounded-md">
                    {formatDuration(item.duration_seconds)}
                  </div>
                )}
                {/* Platform */}
                {item.platform && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 text-gray-800 text-xs font-semibold rounded-md capitalize">
                    {item.platform === 'twitter' ? 'X' : item.platform}
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-6 h-6 text-gray-800 ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-red-600 transition-colors">
                  {item.title}
                </h4>
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                        #{tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="px-2 py-0.5 text-gray-400 text-xs">+{item.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {item.view_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    {item.like_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {item.comment_count.toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString()
                      : new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    {menuOpenId === item.id && (
                      <div className="absolute right-0 bottom-full mb-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-20">
                        <button
                          onClick={() => { onEdit(item); setMenuOpenId(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                        {item.status === 'draft' && (
                          <button
                            onClick={() => { updateContent.mutate({ id: item.id, status: 'published' }); setMenuOpenId(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle className="w-4 h-4" /> Publish
                          </button>
                        )}
                        {item.external_url && (
                          <a
                            href={item.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                          >
                            <ExternalLink className="w-4 h-4" /> View Source
                          </a>
                        )}
                        <button
                          onClick={() => { deleteContent.mutate(item.id); setMenuOpenId(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentUploadModal({
  creatorId,
  contentType,
  categories,
  editingItem,
  onClose,
}: {
  creatorId: string;
  contentType: ContentType;
  categories: { id: string; name: string; slug: string; color: string | null }[];
  editingItem: CreatorContentItem | null;
  onClose: () => void;
}) {
  const createContent = useCreateContent();
  const updateContent = useUpdateContent();
  const isEditing = !!editingItem;

  const [form, setForm] = useState({
    title: editingItem?.title || '',
    description: editingItem?.description || '',
    thumbnail_url: editingItem?.thumbnail_url || '',
    media_url: editingItem?.media_url || '',
    external_url: editingItem?.external_url || '',
    platform: editingItem?.platform || (null as Platform),
    category: editingItem?.category || 'entertainment',
    tags: editingItem?.tags?.join(', ') || '',
    status: editingItem?.status || 'draft' as ContentStatus,
    scheduled_at: editingItem?.scheduled_at?.slice(0, 16) || '',
    duration_seconds: editingItem?.duration_seconds?.toString() || '',
    content_type: editingItem?.content_type || contentType,
  });

  const [error, setError] = useState('');

  const typeLabels: Record<ContentType, string> = {
    video: 'Video',
    livestream: 'Live Stream',
    clip: 'Short Clip',
    social_post: 'Social Post',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    const payload = {
      creator_id: creatorId,
      content_type: form.content_type,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      thumbnail_url: form.thumbnail_url.trim() || undefined,
      media_url: form.media_url.trim() || undefined,
      external_url: form.external_url.trim() || undefined,
      platform: form.platform || undefined,
      category: form.category,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: form.status,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
      duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : undefined,
    };

    try {
      if (isEditing) {
        await updateContent.mutateAsync({ id: editingItem.id, ...payload });
      } else {
        await createContent.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit' : 'New'} {typeLabels[form.content_type]}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content Type Selector */}
        <div className="px-6 pt-5">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {(['video', 'livestream', 'clip', 'social_post'] as ContentType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(f => ({ ...f, content_type: type }))}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  form.content_type === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ContentTypeIcon type={type} className="w-3.5 h-3.5" />
                {typeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Enter a compelling title..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe your content..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* URLs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <Image className="w-3.5 h-3.5" /> Thumbnail URL
              </label>
              <input
                type="url"
                value={form.thumbnail_url}
                onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <LinkIcon className="w-3.5 h-3.5" /> Media/Embed URL
              </label>
              <input
                type="url"
                value={form.media_url}
                onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* External URL & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <Globe className="w-3.5 h-3.5" /> External Link
              </label>
              <input
                type="url"
                value={form.external_url}
                onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))}
                placeholder="https://youtube.com/..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <Share2 className="w-3.5 h-3.5" /> Platform
              </label>
              <select
                value={form.platform || ''}
                onChange={e => setForm(f => ({ ...f, platform: (e.target.value || null) as Platform }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none appearance-none"
              >
                <option value="">None</option>
                {PLATFORM_OPTIONS.map(p => (
                  <option key={p.value} value={p.value!}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none appearance-none"
              >
                {categories.map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Duration (seconds)
              </label>
              <input
                type="number"
                min="0"
                value={form.duration_seconds}
                onChange={e => setForm(f => ({ ...f, duration_seconds: e.target.value }))}
                placeholder="e.g. 120"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Hash className="w-3.5 h-3.5" /> Tags
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="Comma-separated: trending, music, viral"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Status & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as ContentStatus }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none appearance-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Publish Now</option>
                <option value="scheduled">Schedule</option>
                {form.content_type === 'livestream' && <option value="live">Go Live</option>}
              </select>
            </div>
            {form.status === 'scheduled' && (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Schedule Date
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createContent.isPending || updateContent.isPending}
              className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg shadow-red-200"
            >
              {(createContent.isPending || updateContent.isPending)
                ? 'Saving...'
                : isEditing ? 'Update Content' : `Create ${typeLabels[form.content_type]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Eye; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color} border border-transparent`}>
      <Icon className="w-5 h-5 mb-2 opacity-70" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

function ContentTypeCard({ icon: Icon, label, count, color, onClick }: {
  icon: typeof Video; label: string; count: number; color: string; onClick: () => void;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    red: 'border-red-200 bg-red-50 hover:bg-red-100',
    teal: 'border-teal-200 bg-teal-50 hover:bg-teal-100',
    orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    teal: 'text-teal-600',
    orange: 'text-orange-600',
  };

  return (
    <button
      onClick={onClick}
      className={`border rounded-xl p-5 text-left transition-all hover:shadow-md ${colorClasses[color]}`}
    >
      <Icon className={`w-8 h-8 ${iconColors[color]} mb-3`} />
      <p className="text-2xl font-bold text-gray-900">{count}</p>
      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </button>
  );
}

function ContentTypeIcon({ type, className }: { type: ContentType; className?: string }) {
  switch (type) {
    case 'video': return <Video className={className} />;
    case 'livestream': return <Radio className={className} />;
    case 'clip': return <Scissors className={className} />;
    case 'social_post': return <Share2 className={className} />;
  }
}

function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const styles: Record<ContentStatus, string> = {
    draft: 'bg-gray-700/80 text-white',
    published: 'bg-emerald-600/90 text-white',
    scheduled: 'bg-blue-600/90 text-white',
    live: 'bg-red-600 text-white animate-pulse',
    archived: 'bg-gray-500/80 text-white',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize ${styles[status]}`}>
      {status === 'live' ? 'LIVE' : status}
    </span>
  );
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default ContentStudio;
