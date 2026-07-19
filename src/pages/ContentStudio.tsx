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
import { Video, Radio, Scissors, Share2, Plus, Eye, Heart, MessageSquare, TrendingUp, Calendar, Filter, Search, MoreVertical, CreditCard as Edit3, Trash2, ExternalLink, Upload, Play, Tv, ArrowLeft, CheckCircle, AlertCircle, X, Globe, Hash, Image, Link as LinkIcon, Music, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type StudioTab = 'overview' | 'videos' | 'audio' | 'livestreams' | 'clips' | 'social';

const CONTENT_TYPE_MAP: Record<StudioTab, ContentType | null> = {
  overview: null,
  videos: 'video',
  audio: 'audio',
  livestreams: 'livestream',
  clips: 'clip',
  social: 'social_post',
};

const TAB_CONFIG: { key: StudioTab; label: string; icon: typeof Video; color: string }[] = [
  { key: 'overview', label: 'Overview', icon: TrendingUp, color: 'text-gray-700' },
  { key: 'videos', label: 'Videos', icon: Video, color: 'text-blue-600' },
  { key: 'audio', label: 'Audio', icon: Music, color: 'text-purple-600' },
  { key: 'livestreams', label: 'Live Streams', icon: Radio, color: 'text-red-600' },
  { key: 'clips', label: 'Short Clips', icon: Scissors, color: 'text-teal-600' },
  { key: 'social', label: 'Social Posts', icon: Share2, color: 'text-orange-600' },
];

// Recognize the platform straight from a pasted link so creators don't
// have to pick it manually.
function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('twitter.com') || u.includes('x.com/')) return 'twitter';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('twitch.tv')) return 'twitch';
  return null;
}

// One-click share targets; each takes the content URL + title and returns
// the app's share intent URL.
const SHARE_TARGETS: { key: string; label: string; bg: string; href: (url: string, title: string) => string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', bg: 'bg-green-500 hover:bg-green-600', href: (url, title) => `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}` },
  { key: 'facebook', label: 'Facebook', bg: 'bg-blue-600 hover:bg-blue-700', href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: 'x', label: 'X', bg: 'bg-black hover:bg-gray-800', href: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  { key: 'telegram', label: 'Telegram', bg: 'bg-sky-500 hover:bg-sky-600', href: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
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
  // Must be declared before the hooks below use it — referencing it
  // earlier while declared later crashed the whole page (blank screen).
  const isAdmin = profile?.is_admin;
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
    myCreator?.id || (isAdmin ? undefined : 'none'),
    {
      contentType: contentType || undefined,
      status: statusFilter !== 'all' ? statusFilter as ContentStatus : undefined,
    }
  );
  const { data: stats } = useContentStats(myCreator?.id || (isAdmin ? undefined : 'none'));
  const { data: categories = [] } = useContentCategories();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-28 flex items-center justify-center">
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

  if (!isAdmin && (!myCreator || !['approved', 'onboarded'].includes(myCreator.status))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-28 flex items-center justify-center">
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
      <div className="pt-28 pb-12">
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

      {showUploadModal && (myCreator || isAdmin) && (
        <ContentUploadModal
          creatorId={myCreator?.id || ''}
          isAdmin={!!isAdmin}
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
    { type: 'audio' as ContentType, label: 'Upload Audio', icon: Music, color: 'from-purple-500 to-purple-600', bgLight: 'bg-purple-50 border-purple-100' },
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
              icon={Music}
              label="Audio"
              count={stats.audios}
              color="purple"
              onClick={() => onNavigate('audio')}
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
  const [previewItem, setPreviewItem] = useState<CreatorContentItem | null>(null);

  const playableTypes: ContentType[] = ['video', 'audio', 'clip'];

  const handlePlay = (item: CreatorContentItem) => {
    if (playableTypes.includes(item.content_type) && item.media_url) {
      setPreviewItem(item);
    } else if (item.external_url) {
      window.open(item.external_url, '_blank', 'noopener,noreferrer');
    } else if (item.media_url) {
      window.open(item.media_url, '_blank', 'noopener,noreferrer');
    }
  };

  const typeLabels: Record<ContentType, string> = {
    video: 'Videos',
    audio: 'Audio',
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
              <div
                onClick={() => handlePlay(item)}
                className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden cursor-pointer"
              >
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
                        {(item.external_url || item.media_url) && (
                          <div className="px-4 py-2 border-t border-gray-100">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Share with one click</p>
                            <div className="flex items-center gap-1.5">
                              {SHARE_TARGETS.map(t => (
                                <a
                                  key={t.key}
                                  href={t.href((item.external_url || item.media_url)!, item.title)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Share to ${t.label}`}
                                  className={`flex-1 py-1.5 text-center text-[11px] font-bold text-white rounded-md ${t.bg}`}
                                >
                                  {t.label === 'WhatsApp' ? 'WA' : t.label === 'Telegram' ? 'TG' : t.label === 'Facebook' ? 'FB' : 'X'}
                                </a>
                              ))}
                              <button
                                title="Copy link"
                                onClick={() => navigator.clipboard.writeText((item.external_url || item.media_url)!)}
                                className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
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

      {previewItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewItem(null)} />
          <div className="relative bg-black rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {previewItem.content_type === 'audio' ? (
              <div className="p-10 flex flex-col items-center gap-4">
                <Music className="w-16 h-16 text-gray-400" />
                <p className="text-white font-semibold text-center">{previewItem.title}</p>
                <audio controls autoPlay src={previewItem.media_url!} className="w-full" />
              </div>
            ) : (
              <video controls autoPlay src={previewItem.media_url!} className="w-full max-h-[80vh]" />
            )}
          </div>
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
  isAdmin: boolean;
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
    status: editingItem?.status || 'published' as ContentStatus,
    scheduled_at: editingItem?.scheduled_at?.slice(0, 16) || '',
    duration_seconds: editingItem?.duration_seconds?.toString() || '',
    content_type: editingItem?.content_type || contentType,
  });

  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const [copied, setCopied] = useState(false);

  const typeLabels: Record<ContentType, string> = {
    video: 'Video',
    audio: 'Audio',
    livestream: 'Live Stream',
    clip: 'Short Clip',
    social_post: 'Social Post',
  };

  // Video, audio, and clips can be uploaded straight from the device;
  // livestreams and social posts are links by nature.
  const canUploadFile = ['video', 'audio', 'clip'].includes(form.content_type);
  const [mediaSource, setMediaSource] = useState<'upload' | 'link'>(
    isEditing || !canUploadFile ? 'link' : 'upload'
  );

  const captureVideoFrame = (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      const cleanup = () => URL.revokeObjectURL(objectUrl);

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, (video.duration || 2) / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx || canvas.width === 0) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          cleanup();
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };
      video.onerror = () => {
        cleanup();
        resolve(null);
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${creatorId || 'editorial'}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('creator-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = supabase.storage.from('creator-media').getPublicUrl(path);

      let thumbnailUrl = '';
      if (form.content_type === 'video' || form.content_type === 'clip') {
        try {
          const frameBlob = await captureVideoFrame(file);
          if (frameBlob) {
            const thumbPath = `${creatorId || 'editorial'}/${Date.now()}-thumb.jpg`;
            const { error: thumbError } = await supabase.storage
              .from('creator-media')
              .upload(thumbPath, frameBlob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
            if (!thumbError) {
              thumbnailUrl = supabase.storage.from('creator-media').getPublicUrl(thumbPath).data.publicUrl;
            }
          }
        } catch {
          // Frame capture failed (unsupported codec, browser quirk, etc.) — non-fatal, just skip the thumbnail.
        }
      }

      setForm(f => ({
        ...f,
        media_url: data.publicUrl,
        thumbnail_url: thumbnailUrl || f.thumbnail_url,
        platform: f.platform || 'custom',
        title: f.title || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      }));
      setUploadedName(file.name);
    } catch (err) {
      setError(
        'Upload failed: ' + (err instanceof Error ? err.message : 'unknown error') +
        '. If the file is very large, try a smaller file or paste a link instead.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (publishNow: boolean) => {
    setError('');

    if (!form.title.trim()) {
      setError('Please add a title');
      return;
    }

    const finalStatus = publishNow ? 'published' : form.status;

    // Admins (the CEO/editors) may not have a creator profile; create a
    // linked one on the fly the first time they publish studio content.
    let effectiveCreatorId = creatorId;
    if (!effectiveCreatorId) {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setError('Please sign in again.');
        return;
      }
      const { data: mine } = await supabase
        .from('creator_applications')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle();
      if (mine) {
        effectiveCreatorId = (mine as { id: string }).id;
      } else {
        const { data: created, error: createError } = await supabase
          .from('creator_applications')
          .insert({
            user_id: uid,
            display_name: 'CelebUD Editorial',
            email: userData.user?.email || '',
            status: 'onboarded',
            revenue_share_pct: 0,
            total_earnings: 0,
            total_views: 0,
            articles_count: 0,
          })
          .select('id')
          .single();
        if (createError || !created) {
          setError('Could not set up your creator profile: ' + (createError?.message || 'unknown error') + '. Make sure SQL file 11 has been run.');
          return;
        }
        effectiveCreatorId = (created as { id: string }).id;
      }
    }

    const payload = {
      creator_id: effectiveCreatorId,
      content_type: form.content_type,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      thumbnail_url: form.thumbnail_url.trim() || undefined,
      media_url: form.media_url.trim() || undefined,
      external_url: form.external_url.trim() || undefined,
      platform: form.platform || undefined,
      category: form.category,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: finalStatus,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
      duration_seconds: form.duration_seconds ? parseInt(form.duration_seconds) : undefined,
    };

    try {
      if (isEditing) {
        await updateContent.mutateAsync({ id: editingItem.id, ...payload });
      } else {
        await createContent.mutateAsync(payload);
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    }
  };

  if (success) {
    const shareUrl = form.external_url.trim() || form.media_url.trim();
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {isEditing ? 'Updated!' : 'Published!'}
          </h3>
          <p className="text-gray-500">Your {typeLabels[form.content_type].toLowerCase()} is now live.</p>

          {shareUrl && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Share it now with one click:</p>
              <div className="grid grid-cols-2 gap-2">
                {SHARE_TARGETS.map(t => (
                  <a
                    key={t.key}
                    href={t.href(shareUrl, form.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`py-2.5 text-white text-sm font-semibold rounded-xl transition-colors ${t.bg}`}
                  >
                    {t.label}
                  </a>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 sm:pt-20 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEditing ? 'Edit' : 'Post'} {typeLabels[form.content_type]}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Just fill in what you need</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content Type Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide">
            {(['video', 'audio', 'livestream', 'clip', 'social_post'] as ContentType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(f => ({ ...f, content_type: type }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
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
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title - Required */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What's this about?"
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Description - Optional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description (optional)"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Media: upload from device or paste a link */}
          <div>
            {canUploadFile && (
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3">
                <button
                  type="button"
                  onClick={() => setMediaSource('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    mediaSource === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload from device
                </button>
                <button
                  type="button"
                  onClick={() => setMediaSource('link')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    mediaSource === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Paste a link
                </button>
              </div>
            )}

            {canUploadFile && mediaSource === 'upload' ? (
              <label
                className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  uploadedName
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-300 bg-gray-50 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                <input
                  type="file"
                  accept={form.content_type === 'audio' ? 'audio/*' : 'video/*'}
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <>
                    <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-600">Uploading… keep this window open</p>
                  </>
                ) : uploadedName ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">{uploadedName}</p>
                    <p className="text-xs text-gray-500">Uploaded — tap to replace</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">
                      Tap to choose {form.content_type === 'audio' ? 'an audio file' : 'a video'} from your device
                    </p>
                    <p className="text-xs text-gray-400">It uploads and hosts automatically — no links needed</p>
                  </>
                )}
              </label>
            ) : (
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  {form.content_type === 'livestream' ? 'Stream URL' : 'Media/Embed URL'}
                </label>
                <input
                  type="url"
                  value={form.media_url}
                  onChange={e => {
                    const value = e.target.value;
                    setForm(f => ({ ...f, media_url: value, platform: detectPlatform(value) || f.platform }));
                  }}
                  placeholder="Paste your YouTube, TikTok, or video link here"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  YouTube, TikTok, Instagram, Facebook, or direct link — the platform is detected automatically
                </p>
                {form.platform && (
                  <p className="text-xs font-medium text-emerald-600 mt-1 capitalize">
                    ✓ Platform: {form.platform === 'twitter' ? 'X' : form.platform}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors w-full"
          >
            <div className={`w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
              <span className="text-xs">+</span>
            </div>
            {showAdvanced ? 'Hide' : 'Show'} more options (thumbnail, tags, schedule)
          </button>

          {/* Advanced Options - Collapsible */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              {/* Platform override */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, platform: f.platform === p.value ? null : p.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        form.platform === p.value
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
                  <Image className="w-3.5 h-3.5" /> Thumbnail
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={thumbnailUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setThumbnailUploading(true);
                        try {
                          const path = `${creatorId || 'editorial'}/${Date.now()}-cover.jpg`;
                          const { error: upErr } = await supabase.storage
                            .from('creator-media')
                            .upload(path, file, { cacheControl: '3600', upsert: false });
                          if (upErr) throw new Error(upErr.message);
                          const url = supabase.storage.from('creator-media').getPublicUrl(path).data.publicUrl;
                          setForm(f => ({ ...f, thumbnail_url: url }));
                        } catch (err) {
                          setError('Thumbnail upload failed: ' + (err instanceof Error ? err.message : 'unknown error'));
                        } finally {
                          setThumbnailUploading(false);
                        }
                      }}
                    />
                    {thumbnailUploading ? 'Uploading...' : 'Upload from device'}
                  </label>
                  <input
                    type="url"
                    value={form.thumbnail_url}
                    onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                    placeholder="or paste an image URL"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                {form.content_type === 'video' && form.thumbnail_url && (
                  <p className="mt-1.5 text-xs text-emerald-600">
                    ✓ Auto-captured from your video — upload a different image above to replace it.
                  </p>
                )}
                {form.thumbnail_url && (
                  <img
                    src={form.thumbnail_url}
                    alt="Thumbnail preview"
                    className="mt-2 h-20 w-32 object-cover rounded-lg border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>

              {/* External URL */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
                  <Globe className="w-3.5 h-3.5" /> External Link
                </label>
                <input
                  type="url"
                  value={form.external_url}
                  onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))}
                  placeholder="Link to original source"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none appearance-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (sec)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.duration_seconds}
                    onChange={e => setForm(f => ({ ...f, duration_seconds: e.target.value }))}
                    placeholder="e.g. 120"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
                  <Hash className="w-3.5 h-3.5" /> Tags
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="trending, music, viral"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
                  <Calendar className="w-3.5 h-3.5" /> Schedule for later
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value, status: e.target.value ? 'scheduled' : 'draft' }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={createContent.isPending || updateContent.isPending || uploading}
            className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={createContent.isPending || updateContent.isPending || uploading}
            className="flex-[2] py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg shadow-red-200 flex items-center justify-center gap-2"
          >
            {(createContent.isPending || updateContent.isPending) ? (
              'Publishing...'
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Publish Now
              </>
            )}
          </button>
        </div>
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
    purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
    red: 'border-red-200 bg-red-50 hover:bg-red-100',
    teal: 'border-teal-200 bg-teal-50 hover:bg-teal-100',
    orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
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
    case 'audio': return <Music className={className} />;
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
