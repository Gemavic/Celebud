import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from '../utils/date';
import { 
  Calendar, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle, 
  Settings,
  Plus,
  Archive,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface EditorialFeature {
  id: string;
  content_id: string;
  title: string | null;
  editorial_description: string | null;
  feature_type: string;
  priority: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  discussion_enabled: boolean;
  call_to_action: string;
  engagement_goal: string | null;
  discussion_count: number;
  days_remaining: number | null;
  media_content: {
    title: string;
    thumbnail_url: string | null;
    slug: string;
  };
}

export function EditorialDashboard() {
  const { user, profile } = useAuth();
  const [features, setFeatures] = useState<EditorialFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.is_admin) {
      loadEditorialFeatures();
      loadAvailableContent();
    }
  }, [profile]);

  async function loadEditorialFeatures() {
    try {
      const { data, error } = await supabase
        .from('editorial_features')
        .select(`
          *,
          media_content:content_id (title, thumbnail_url, slug),
          editorial_discussions (id)
        `)
        .order('priority')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const featuresWithCounts = data.map(feature => ({
        ...feature,
        discussion_count: feature.editorial_discussions?.length || 0,
        days_remaining: feature.end_date 
          ? Math.ceil((new Date(feature.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
      }));

      setFeatures(featuresWithCounts);
    } catch (error) {
      console.error('Error loading editorial features:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableContent() {
    try {
      const { data, error } = await supabase
        .from('media_content')
        .select('id, title, thumbnail_url, published_at, views_count')
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSelectedContent(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    }
  }

  async function archiveFeature(featureId: string) {
    try {
      await supabase
        .from('editorial_features')
        .update({ is_active: false })
        .eq('id', featureId);

      await supabase
        .from('editorial_actions')
        .insert({
          feature_id: featureId,
          action_type: 'archived',
          action_description: 'Manually archived by admin',
          performed_by: user?.id
        });

      loadEditorialFeatures();
    } catch (error) {
      console.error('Error archiving feature:', error);
    }
  }

  async function extendFeature(featureId: string, days: number) {
    try {
      const { error } = await supabase.rpc('extend_editorial_feature', {
        feature_id_param: featureId,
        additional_days: days,
        reason: 'Extended by admin for continued engagement'
      });

      if (error) throw error;
      loadEditorialFeatures();
    } catch (error) {
      console.error('Error extending feature:', error);
    }
  }

  async function toggleDiscussion(featureId: string, enabled: boolean) {
    try {
      await supabase
        .from('editorial_features')
        .update({ discussion_enabled: enabled })
        .eq('id', featureId);

      await supabase
        .from('editorial_actions')
        .insert({
          feature_id: featureId,
          action_type: enabled ? 'discussion_opened' : 'discussion_closed',
          action_description: enabled ? 'Discussion enabled' : 'Discussion disabled',
          performed_by: user?.id
        });

      loadEditorialFeatures();
    } catch (error) {
      console.error('Error toggling discussion:', error);
    }
  }

  const getFeatureTypeIcon = (type: string) => {
    switch (type) {
      case 'breaking': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'trending': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'discussion': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'interview_spotlight': return <Settings className="w-4 h-4 text-purple-500" />;
      case 'hot_topic': return <TrendingUp className="w-4 h-4 text-pink-500" />;
      default: return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (feature: EditorialFeature) => {
    if (!feature.is_active) return 'bg-gray-100 border-gray-300';
    if (feature.days_remaining !== null && feature.days_remaining <= 2) return 'bg-red-50 border-red-300';
    if (feature.days_remaining !== null && feature.days_remaining <= 7) return 'bg-yellow-50 border-yellow-300';
    return 'bg-green-50 border-green-300';
  };

  if (!profile?.is_admin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading editorial dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editorial Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage featured content, discussions, and audience engagement</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Feature Content</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Features</p>
              <p className="text-2xl font-bold text-gray-900">
                {features.filter(f => f.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Discussions</p>
              <p className="text-2xl font-bold text-gray-900">
                {features.reduce((sum, f) => sum + f.discussion_count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">
                {features.filter(f => f.is_active && f.days_remaining !== null && f.days_remaining <= 7).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">
                {features.filter(f => f.is_active && f.priority <= 3).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Features List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Editorial Features</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {features.length === 0 ? (
            <div className="p-8 text-center">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No editorial features created yet.</p>
            </div>
          ) : (
            features.map((feature) => (
              <div key={feature.id} className={`p-6 ${getStatusColor(feature)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getFeatureTypeIcon(feature.feature_type)}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Priority {feature.priority}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        feature.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {feature.is_active ? 'Active' : 'Archived'}
                      </span>
                      {feature.days_remaining !== null && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          feature.days_remaining <= 2 ? 'bg-red-100 text-red-800' :
                          feature.days_remaining <= 7 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {feature.days_remaining} days left
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title || feature.media_content?.title}
                    </h3>

                    {feature.editorial_description && (
                      <p className="text-gray-600 mb-3">{feature.editorial_description}</p>
                    )}

                    {feature.engagement_goal && (
                      <p className="text-sm text-blue-600 mb-3">
                        <strong>Goal:</strong> {feature.engagement_goal}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Started {formatDistanceToNow(feature.start_date)}
                      </span>
                      <span className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {feature.discussion_count} discussions
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleDiscussion(feature.id, !feature.discussion_enabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        feature.discussion_enabled
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={feature.discussion_enabled ? 'Disable Discussion' : 'Enable Discussion'}
                    >
                      {feature.discussion_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => extendFeature(feature.id, 7)}
                      className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                      title="Extend by 7 days"
                    >
                      <Clock className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => archiveFeature(feature.id)}
                      className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Feature Modal would go here */}
      {showCreateModal && (
        <CreateEditorialFeatureModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={loadEditorialFeatures}
          availableContent={selectedContent}
        />
      )}
    </div>
  );
}

interface CreateEditorialFeatureModalProps {
  onClose: () => void;
  onCreated: () => void;
  availableContent: any[];
}

function CreateEditorialFeatureModal({ onClose, onCreated, availableContent }: CreateEditorialFeatureModalProps) {
  const [formData, setFormData] = useState({
    content_id: '',
    title: '',
    editorial_description: '',
    feature_type: 'trending',
    priority: 5,
    duration_days: 7,
    discussion_enabled: true,
    call_to_action: 'Join the discussion',
    engagement_goal: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + formData.duration_days);

      const { error } = await supabase
        .from('editorial_features')
        .insert({
          content_id: formData.content_id,
          title: formData.title || null,
          editorial_description: formData.editorial_description || null,
          feature_type: formData.feature_type,
          priority: formData.priority,
          end_date: endDate.toISOString(),
          discussion_enabled: formData.discussion_enabled,
          call_to_action: formData.call_to_action,
          engagement_goal: formData.engagement_goal || null,
          created_by: supabase.auth.user()?.id,
        });

      if (error) throw error;

      onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating editorial feature:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Create Editorial Feature</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <select
              value={formData.content_id}
              onChange={(e) => setFormData({ ...formData, content_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select content</option>
              {availableContent.map((content) => (
                <option key={content.id} value={content.id}>
                  {content.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Editorial Title (Optional)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Override default title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Editorial Description</label>
            <textarea
              value={formData.editorial_description}
              onChange={(e) => setFormData({ ...formData, editorial_description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              placeholder="Why is this featured? What should readers focus on?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Feature Type</label>
              <select
                value={formData.feature_type}
                onChange={(e) => setFormData({ ...formData, feature_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="breaking">Breaking News</option>
                <option value="trending">Trending</option>
                <option value="discussion">Discussion Topic</option>
                <option value="interview_spotlight">Interview Spotlight</option>
                <option value="hot_topic">Hot Topic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration (days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.duration_days}
              onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Engagement Goal</label>
            <input
              type="text"
              value={formData.engagement_goal}
              onChange={(e) => setFormData({ ...formData, engagement_goal: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="What engagement do you want? (e.g., debate, shares, awareness)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Call to Action</label>
            <input
              type="text"
              value={formData.call_to_action}
              onChange={(e) => setFormData({ ...formData, call_to_action: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.discussion_enabled}
              onChange={(e) => setFormData({ ...formData, discussion_enabled: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm font-medium">Enable discussions</label>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}