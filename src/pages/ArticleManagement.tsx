import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RecategorizeArticle } from '../components/RecategorizeArticle';
import { Search, Filter, RefreshCw, Eye, Calendar } from 'lucide-react';
import { formatDistanceToNow } from '../utils/date';

interface Article {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  published_at: string;
  views_count: number;
  comments_count: number;
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
          category_id,
          published_at,
          views_count,
          comments_count,
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
        <p className="text-gray-600">Manage and recategorize articles across your platform</p>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
