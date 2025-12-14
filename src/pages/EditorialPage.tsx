import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { EditorialDashboard } from '../components/EditorialDashboard';
import { EditorialSection } from '../components/EditorialSection';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function EditorialPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'featured' | 'create' | 'dashboard'>('featured');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category_id: '',
    thumbnail_url: '',
    is_featured: false,
    is_trending: false,
  });

  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    content: '',
    category_id: '',
    thumbnail_url: '',
    is_featured: false,
    is_trending: false,
  });

  useEffect(() => {
    // Allow all users to view the editorial page, but limit creation to admins
    if (activeTab === 'create' || activeTab === 'dashboard') {
      if (!user || !profile?.is_admin) {
        setActiveTab('featured');
      }
    }

    loadCategories();
  }, [user, profile, navigate]);

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!createFormData.title.trim() || !createFormData.content.trim()) {
      setError('Title and content are required');
      setLoading(false);
      return;
    }

    try {

      const slug = createFormData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { error: insertError } = await supabase
        .from('media_content')
        .insert({
          title: createFormData.title,
          slug,
          description: createFormData.description,
          content: createFormData.content,
          category_id: createFormData.category_id || null,
          thumbnail_url: createFormData.thumbnail_url || null,
          author_id: user?.id,
          media_type: 'article',
          is_featured: createFormData.is_featured,
          is_trending: createFormData.is_trending,
          published_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setCreateFormData({
        title: '',
        description: '',
        content: '',
        category_id: '',
        thumbnail_url: '',
        is_featured: false,
        is_trending: false,
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to publish article');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-44 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Editorial</h1>
              <p className="text-gray-600 mt-2">Featured content, hot topics, and community discussions</p>
            </div>
            
            <Link
              to="/"
              className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-8 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('featured')}
              className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${
                activeTab === 'featured'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Featured Content</span>
              </div>
            </button>
            
            {user && profile?.is_admin && (
              <>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${
                    activeTab === 'create'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Save className="w-5 h-5" />
                    <span>Create Article</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Manage Features</span>
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'featured' && (
            <div>
              <EditorialSection />
            </div>
          )}

          {activeTab === 'create' && user && profile?.is_admin && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Article</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={createFormData.title}
                onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter article title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={createFormData.category_id}
                onChange={(e) => setCreateFormData({ ...createFormData, category_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Brief description or excerpt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={createFormData.content}
                onChange={(e) => setCreateFormData({ ...createFormData, content: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                rows={15}
                placeholder="Write your article content here..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thumbnail URL
              </label>
              <input
                type="url"
                value={createFormData.thumbnail_url}
                onChange={(e) => setCreateFormData({ ...createFormData, thumbnail_url: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={createFormData.is_featured}
                  onChange={(e) => setCreateFormData({ ...createFormData, is_featured: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Featured Article</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={createFormData.is_trending}
                  onChange={(e) => setCreateFormData({ ...createFormData, is_trending: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Trending Article</span>
              </label>
            </div>

            {error && (
              <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 bg-green-50 p-4 rounded-lg">
                Article published successfully! Redirecting...
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setActiveTab('featured')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-5 h-5 mr-2" />
                {loading ? 'Publishing...' : 'Publish Article'}
              </button>
            </div>
          </form>
            </div>
          )}
          
          {activeTab === 'dashboard' && user && profile?.is_admin && (
            <EditorialDashboard />
          )}
        </div>
      </main>
    </div>
  );
}
