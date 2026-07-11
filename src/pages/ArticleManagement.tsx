import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RecategorizeArticle } from '../components/RecategorizeArticle';
import { Search, Filter, RefreshCw, Eye, Calendar, Pencil, Trash2, X, Save, CheckCircle, Share2, Send, Copy, CheckCheck, Facebook, MessageCircle, Bell } from 'lucide-react';
import { formatDistanceToNow } from '../utils/date';

// Posts to the CelebUD Facebook Page + Telegram channel via the
// share-to-socials edge function (hosted on the companion Supabase
// project, which holds the page/bot tokens). The full article payload is
// sent along because that project's own database has no articles to look
// up. Function has public invocation enabled and open CORS.
const SHARE_ENDPOINT = 'https://ucsuyrhlhmqezubfoszx.supabase.co/functions/v1/share-to-socials';

async function queueShareRequest(article: Article): Promise<string> {
  const res = await fetch(SHARE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      article: {
        id: article.id,
        title: article.title,
        description: article.description || undefined,
        thumbnail_url: article.thumbnail_url || undefined,
        category_name: article.categories?.name,
      },
    }),
  });
  if (!res.ok) throw new Error(`Share service error (${res.status})`);
  const data = await res.json();
  const result = data?.results?.[0];
  const fb = result?.facebook;
  const tg = result?.telegram;
  if (fb && !fb.success) {
    throw new Error('Facebook: ' + (fb.error || 'post failed') + (tg ? ' (Telegram posted OK)' : ''));
  }
  return `Posted to Facebook${fb?.post_id ? '' : ''}${tg ? ' & Telegram' : ' (Telegram failed)'}`;
}

interface Author {
  id: string;
  name: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  thumbnail_url: string | null;
  category_id: string;
  author_id: string | null;
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
  const { profile, user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    content: '',
    thumbnail_url: '',
    category_id: '',
    author_id: '',
    is_featured: false,
    is_trending: false,
    seo_title: '',
    seo_keywords: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [shareArticle, setShareArticle] = useState<Article | null>(null);
  const [sharePosting, setSharePosting] = useState(false);
  const [shareResult, setShareResult] = useState<string | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [bulkPosting, setBulkPosting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; results: string[] } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchCategories();
      fetchAuthors();
      fetchArticles();
    }
  }, [profile, selectedCategory]);

  const fetchAuthors = async () => {
    try {
      const { data, error } = await supabase
        .from('authors')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setAuthors(data || []);
    } catch (err) {
      console.error('Error fetching authors:', err);
    }
  };

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
          author_id,
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

  const assignAuthor = async (articleId: string, authorId: string) => {
    setAssigningId(articleId);
    try {
      const { error } = await supabase
        .from('media_content')
        .update({ author_id: authorId })
        .eq('id', articleId);
      if (error) throw error;
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, author_id: authorId } : a));
      setAssignedId(articleId);
      setTimeout(() => setAssignedId(null), 2000);
    } catch (err) {
      console.error('Error assigning author:', err);
      alert('Failed to assign author. Please try again.');
    } finally {
      setAssigningId(null);
    }
  };

  const authorBtnClass = (authorName: string, isCurrent: boolean) => {
    const base = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer';
    if (authorName.includes('Matthew'))
      return `${base} ${isCurrent ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white'}`;
    if (authorName.includes('Gbenga'))
      return `${base} ${isCurrent ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-600 hover:text-white'}`;
    if (authorName.includes('Victoria'))
      return `${base} ${isCurrent ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white'}`;
    return `${base} ${isCurrent ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-700 hover:text-white'}`;
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
      author_id: article.author_id || '',
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
          author_id: editForm.author_id || null,
          is_featured: editForm.is_featured,
          is_trending: editForm.is_trending,
          seo_title: editForm.seo_title || null,
          seo_keywords: editForm.seo_keywords || null,
        })
        .eq('id', editingArticle.id);

      if (error) throw error;

      setEditingArticle(null);
      fetchArticles();
    } catch (err: unknown) {
      console.error('Error saving article:', err);
      const msg = err instanceof Error ? err.message
        : (err as { message?: string })?.message ?? JSON.stringify(err);
      alert(`Failed to save article: ${msg}`);
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

  const toggleSelect = (id: string) => {
    setSelectedArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const copyForWhatsApp = (article: Article) => {
    const url = `https://www.celebud.com/article/${article.id}`;
    const text = `*${article.title}*\n\n${article.description ? article.description.slice(0, 200) + (article.description.length > 200 ? '...' : '') : ''}\n\nRead more: ${url}\n\n#CelebUD #News`;
    navigator.clipboard.writeText(text);
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const pushSingleArticle = async (article: Article) => {
    setSharePosting(true);
    setShareResult(null);
    try {
      const summary = await queueShareRequest(article);
      setShareResult(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setShareResult('Error: ' + msg);
    } finally {
      setSharePosting(false);
    }
  };

  const sendBreakingNewsPush = async (article: Article) => {
    setNotifyingId(article.id);
    setNotifyResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: article.title,
          body: article.description || 'Read the full story on CelebUD.',
          url: `/article/${article.id}`,
          image: article.thumbnail_url || undefined,
          category_id: article.category_id || undefined,
        },
      });
      if (error) throw error;
      setNotifyResult(`Sent to ${data?.sent ?? 0} subscriber${data?.sent === 1 ? '' : 's'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotifyResult('Error: ' + msg);
    } finally {
      setNotifyingId(null);
      setTimeout(() => setNotifyResult(null), 4000);
    }
  };

  const bulkPushToChannels = async () => {
    if (selectedArticles.size === 0) return;
    setBulkPosting(true);
    const ids = Array.from(selectedArticles);
    setBulkProgress({ done: 0, total: ids.length, results: [] });

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const article = articles.find(a => a.id === id);
      const title = article?.title.slice(0, 40) + (article && article.title.length > 40 ? '...' : '') || id;
      try {
        if (!article) throw new Error('Article not loaded');
        await queueShareRequest(article);
        setBulkProgress(prev => ({
          done: i + 1,
          total: ids.length,
          results: [...(prev?.results || []), `${title}: Posted`],
        }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message.slice(0, 60) : 'Error';
        setBulkProgress(prev => ({
          done: i + 1,
          total: ids.length,
          results: [...(prev?.results || []), `${title}: ${msg}`],
        }));
      }
    }

    setBulkPosting(false);
  };

  if (!profile?.is_admin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {notifyResult && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            notifyResult.startsWith('Error') ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {notifyResult}
        </div>
      )}
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
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Articles</h2>
            {selectedArticles.size > 0 && (
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {selectedArticles.size} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {selectedArticles.size > 0 && (
              <>
                <button
                  onClick={() => setSelectedArticles(new Set())}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
                <button
                  onClick={bulkPushToChannels}
                  disabled={bulkPosting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-sm"
                >
                  {bulkPosting
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Posting {bulkProgress?.done}/{bulkProgress?.total}...</>
                    : <><Send className="w-4 h-4" /> Push {selectedArticles.size} to Facebook &amp; Telegram</>
                  }
                </button>
              </>
            )}
            <button
              onClick={fetchArticles}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk progress log */}
        {bulkProgress && !bulkPosting && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Bulk Push Results ({bulkProgress.done}/{bulkProgress.total})</p>
              <button onClick={() => setBulkProgress(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {bulkProgress.results.map((r, i) => (
                <p key={i} className={`text-xs font-mono ${r.includes('Error') ? 'text-red-600' : r.includes('failed') ? 'text-amber-600' : 'text-green-700'}`}>{r}</p>
              ))}
            </div>
          </div>
        )}

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
            {/* Select all row */}
            <div className="px-6 py-2.5 bg-gray-50 flex items-center gap-3 border-b border-gray-100">
              <input
                type="checkbox"
                checked={selectedArticles.size === filteredArticles.length && filteredArticles.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
              />
              <span className="text-xs text-gray-500 font-medium">
                {selectedArticles.size === filteredArticles.length && filteredArticles.length > 0 ? 'Deselect all' : 'Select all'}
              </span>
            </div>
            {filteredArticles.map((article) => (
              <div key={article.id} className={`p-6 hover:bg-gray-50 transition-colors ${selectedArticles.has(article.id) ? 'bg-blue-50/60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedArticles.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer mt-1 shrink-0"
                    />
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

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-sm text-gray-500 font-medium">Author:</span>
                      {assignedId === article.id ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-700">
                          <CheckCircle className="w-4 h-4" /> Saved!
                        </span>
                      ) : assigningId === article.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      ) : (
                        <>
                          {/* Current author label */}
                          <span className="text-sm font-semibold text-gray-800">
                            {authors.find(a => a.id === article.author_id)?.name ?? <span className="text-red-500 italic">Unassigned</span>}
                          </span>
                          <span className="text-gray-300 text-xs mx-1">|</span>
                          <span className="text-xs text-gray-400">Assign to:</span>
                          {authors.map(author => {
                            const isCurrent = article.author_id === author.id;
                            return (
                              <button
                                key={author.id}
                                onClick={() => !isCurrent && assignAuthor(article.id, author.id)}
                                className={authorBtnClass(author.name, isCurrent)}
                                title={isCurrent ? `Currently: ${author.name}` : `Assign to ${author.name}`}
                              >
                                {isCurrent ? `✓ ${author.name.split(' ')[0]}` : author.name.split(' ')[0]}
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                    </div>{/* closes flex-1 min-w-0 content */}
                  </div>{/* closes flex items-start gap-3 checkbox+content wrapper */}

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setShareArticle(article); setShareResult(null); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    <button
                      onClick={() => sendBreakingNewsPush(article)}
                      disabled={notifyingId === article.id}
                      title="Push a breaking-news alert to subscribers"
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
                    >
                      <Bell className="w-4 h-4" />
                      {notifyingId === article.id ? 'Sending…' : 'Notify'}
                    </button>
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Author / Writer</label>
                <select
                  value={editForm.author_id}
                  onChange={(e) => setEditForm({ ...editForm, author_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">— Unassigned —</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
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
      {/* Share Modal */}
      {shareArticle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">Share Article</h2>
              <button
                onClick={() => { setShareArticle(null); setShareResult(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{shareArticle.title}</p>

              {/* Auto-post section — most important, shown first */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Auto-Post to Channels</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => pushSingleArticle(shareArticle)}
                    disabled={sharePosting}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {sharePosting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
                    Facebook Page
                  </button>
                  <button
                    onClick={() => pushSingleArticle(shareArticle)}
                    disabled={sharePosting}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-500 text-white rounded-lg font-semibold text-sm hover:bg-sky-600 disabled:opacity-50 transition-colors"
                  >
                    {sharePosting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Telegram Channel
                  </button>
                </div>
                {shareResult && (
                  <p className={`text-xs font-medium leading-relaxed px-1 ${shareResult.startsWith('Error') ? 'text-red-600' : 'text-blue-800'}`}>
                    {shareResult}
                  </p>
                )}
              </div>

              {/* WhatsApp Channel — manual copy */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider">WhatsApp Channel</p>
                    <p className="text-xs text-green-600 mt-0.5">Copy text, then paste in your WhatsApp Channel app</p>
                  </div>
                  <button
                    onClick={() => copyForWhatsApp(shareArticle)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-sm transition-all shrink-0 ${
                      copiedId === shareArticle.id
                        ? 'bg-green-600 text-white'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {copiedId === shareArticle.id
                      ? <><CheckCheck className="w-4 h-4" /> Copied!</>
                      : <><Copy className="w-4 h-4" /> Copy Post</>
                    }
                  </button>
                </div>
                <div className="bg-white/70 rounded-lg p-2.5 text-xs text-gray-600 font-mono leading-relaxed border border-green-100">
                  <p className="font-bold text-gray-800">{shareArticle.title}</p>
                  {shareArticle.description && (
                    <p className="mt-1 text-gray-600">{shareArticle.description.slice(0, 120)}{shareArticle.description.length > 120 ? '...' : ''}</p>
                  )}
                  <p className="mt-1.5 text-blue-600">celebud.com/article/{shareArticle.id}</p>
                  <p className="text-gray-400 mt-0.5">#CelebUD #News</p>
                </div>
                <p className="text-[11px] text-green-600 mt-2 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  After copying: open WhatsApp → your Channel → New Update → paste
                </p>
              </div>

              {/* Share links */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Share Links (open in browser)</p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareArticle.title + '\n\nRead on CelebUD: https://www.celebud.com/article/' + shareArticle.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 bg-green-500 text-white rounded-lg font-semibold text-sm hover:bg-green-600 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WA Share
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent('https://www.celebud.com/article/' + shareArticle.id)}&text=${encodeURIComponent(shareArticle.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 bg-sky-500 text-white rounded-lg font-semibold text-sm hover:bg-sky-600 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 12 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    TG Share
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent('https://www.celebud.com/article/' + shareArticle.id)}&text=${encodeURIComponent(shareArticle.title)}&via=celebudmedia`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 bg-black text-white rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                    X / Twitter
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://www.celebud.com/article/' + shareArticle.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    FB Share
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
