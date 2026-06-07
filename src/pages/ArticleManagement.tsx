import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RecategorizeArticle } from '../components/RecategorizeArticle';
import { Search, Filter, RefreshCw, Eye, Calendar, Pencil, Trash2, X, Save } from 'lucide-react';
import { formatDistanceToNow } from '../utils/date';

interface Article {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  thumbnail_url: string | null;
  category_id: string;
  published_at: string;
  views_count: number;
  comments_count: number;
  is_featured: boolean;
  is_trending: boolean;
  seo_title: string | null;
  seo_keywords: string | null;
  categories: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function ArticleManagement() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    content: '',
    thumbnail_url: '',
    category_id: '',
    is_featured: false,
    is_trending: false,
    seo_title: '',
    seo_keywords: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchCategories();
      fetchArticles();
    }
  }, [profile, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_content')
        .select(`
          id,
          title,
          slug,
          description,
          content,
          thumbnail_url,
          category_id,
          published_at,
          views_count,
          comments_count,
          is_featured,
          is_trending,
          seo_title,
          seo_keywords,
          categories:category_id (
            id,
            name,
            slug
          )
        `)
        .eq('media_type', 'article')
        .order('published_at', { ascending: false })
        .limit(50);

      if (selectedCategory !== 'all') {
        if (selectedCategory === 'uncategorized') {
          query = query.is('category_id', null);
        } else {
          query = query.eq('category_id', selectedCategory);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorize = () => {
    fetchArticles();
  };

  const openEditor = (article: Article) => {
    setEditingArticle(article);
    setEditForm({
      title: article.title || '',
      description: article.description || '',
      content: article.content || '',
      thumbnail_url: article.thumbnail_url || '',
      category_id: article.category_id || '',
      is_featured: article.is_featured || false,
      is_trending: article.is_trending || false,
      seo_title: article.seo_title || '',
      seo_keywords: article.seo_keywords || '',
    });
  };

  const closeEditor = () => {
    setEditingArticle(null);
  };

  const saveArticle = async () => {
    if (!editingArticle) return;
    setSaving(true);
    try {
      const slug = editForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 180);

      const { error } = await supabase
        .from('media_content')
        .update({
          title: editForm.title,
          slug,
          description: editForm.description || null,
          content: editForm.content || null,
          thumbnail_url: editForm.thumbnail_url || null,
          category_id: editForm.category_id || null,
          is_featured: editForm.is_featured,
          is_trending: editForm.is_trending,
          seo_title: editForm.seo_title || null,
          seo_keywords: editForm.seo_keywords || null,
          is_manual: true,
        })
        .eq('id', editingArticle.id);

      if (error) throw error;
      setEditingArticle(null);
      fetchArticles();
    } catch (err) {
      console.error('Error saving article:', err);
      alert('Failed to save article. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('media_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeleteConfirmId(null);
      fetchArticles();
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article.');
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!profile?.is_admin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Article Management</h1>
        <p className="text-gray-600">Manage, edit, and recategorize articles across your platform</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Articles</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{articles.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Categories</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{categories.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Views</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {articles.reduce((sum, a) => sum + (a.views_count || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total Comments</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {articles.reduce((sum, a) => sum + (a.comments_count || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Articles</h2>
          <button
            onClick={fetchArticles}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading articles...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No articles found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredArticles.map((article) => (
              <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                      {article.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(article.published_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {article.views_count?.toLocaleString() || 0} views
                      </span>
                      <span>
                        {article.comments_count || 0} comments
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">Category:</span>
                      <RecategorizeArticle
                        articleId={article.id}
                        currentCategoryId={article.category_id || ''}
                        currentCategoryName={article.categories?.name || 'Uncategorized'}
                        onRecategorize={handleRecategorize}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditor(article)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    {deleteConfirmId === article.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteArticle(article.id)}
                          className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(article.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingArticle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-gray-900">Edit Article</h2>
              <button
                onClick={closeEditor}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thumbnail URL</label>
                  <input
                    type="text"
                    value={editForm.thumbnail_url}
                    onChange={(e) => setEditForm({ ...editForm, thumbnail_url: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                  {editForm.thumbnail_url && (
                    <img
                      src={editForm.thumbnail_url}
                      alt="Preview"
                      className="mt-2 h-20 w-32 object-cover rounded-lg border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">SEO Title</label>
                  <input
                    type="text"
                    value={editForm.seo_title}
                    onChange={(e) => setEditForm({ ...editForm, seo_title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Custom SEO title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">SEO Keywords</label>
                  <input
                    type="text"
                    value={editForm.seo_keywords}
                    onChange={(e) => setEditForm({ ...editForm, seo_keywords: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="keyword1, keyword2, ..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_featured}
                    onChange={(e) => setEditForm({ ...editForm, is_featured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_trending}
                    onChange={(e) => setEditForm({ ...editForm, is_trending: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Trending</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={closeEditor}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveArticle}
                disabled={saving || !editForm.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
