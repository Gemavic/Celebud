import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, Settings, TrendingUp, Upload, Image, User as UserIcon, X } from 'lucide-react';
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

interface Author {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function EditorialPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'featured' | 'create' | 'dashboard'>('featured');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [authorPhotoFile, setAuthorPhotoFile] = useState<File | null>(null);
  const [authorPhotoPreview, setAuthorPhotoPreview] = useState('');
  const [showNewAuthor, setShowNewAuthor] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const authorPhotoInputRef = useRef<HTMLInputElement>(null);

  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    content: '',
    category_id: '',
    thumbnail_url: '',
    author_id: '',
    is_featured: false,
    is_trending: false,
    seo_title: '',
    seo_keywords: '',
  });

  const [newAuthor, setNewAuthor] = useState({
    name: '',
    bio: '',
  });

  useEffect(() => {
    if (activeTab === 'create' || activeTab === 'dashboard') {
      if (!user || !profile?.is_admin) {
        setActiveTab('featured');
      }
    }
    loadCategories();
    loadAuthors();
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

  async function loadAuthors() {
    try {
      const { data, error } = await supabase
        .from('authors')
        .select('id, name, avatar_url, bio')
        .order('name');
      if (error) throw error;
      setAuthors(data || []);
    } catch (err) {
      console.error('Error loading authors:', err);
    }
  }

  function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setCreateFormData({ ...createFormData, thumbnail_url: '' });
  }

  function handleAuthorPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAuthorPhotoFile(file);
    setAuthorPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadFile(file: File, folder: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('media')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
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
      let authorId = createFormData.author_id;

      // Create new author if needed
      if (showNewAuthor && newAuthor.name.trim()) {
        let authorAvatarUrl: string | null = null;
        if (authorPhotoFile) {
          authorAvatarUrl = await uploadFile(authorPhotoFile, 'authors');
        }

        const { data: newAuthorData, error: authorError } = await supabase
          .from('authors')
          .insert({
            name: newAuthor.name,
            bio: newAuthor.bio || null,
            avatar_url: authorAvatarUrl,
          })
          .select('id')
          .single();

        if (authorError) throw authorError;
        authorId = newAuthorData.id;
      }

      if (!authorId) {
        setError('Please select an author or create a new one');
        setLoading(false);
        return;
      }

      // Upload thumbnail if file provided
      let thumbnailUrl = createFormData.thumbnail_url || null;
      if (thumbnailFile) {
        thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');
      }

      const slug = createFormData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { error: insertError } = await supabase
        .from('media_content')
        .insert({
          title: createFormData.title,
          slug,
          description: createFormData.description || null,
          content: createFormData.content,
          category_id: createFormData.category_id || null,
          thumbnail_url: thumbnailUrl,
          author_id: authorId,
          media_type: 'article',
          is_featured: createFormData.is_featured,
          is_trending: createFormData.is_trending,
          seo_title: createFormData.seo_title || null,
          seo_keywords: createFormData.seo_keywords || null,
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
        author_id: '',
        is_featured: false,
        is_trending: false,
        seo_title: '',
        seo_keywords: '',
      });
      setThumbnailFile(null);
      setThumbnailPreview('');
      setAuthorPhotoFile(null);
      setAuthorPhotoPreview('');
      setNewAuthor({ name: '', bio: '' });
      setShowNewAuthor(false);

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

          <div className="flex space-x-1 mb-8 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('featured')}
              className={`flex-1 py-3 px-6 rounded-md font-medium transition-all ${
                activeTab === 'featured'
                  ? 'bg-white text-red-600 shadow-sm'
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
                      ? 'bg-white text-red-600 shadow-sm'
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
                      ? 'bg-white text-red-600 shadow-sm'
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

          {activeTab === 'featured' && <EditorialSection />}

          {activeTab === 'create' && user && profile?.is_admin && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Article</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={createFormData.title}
                    onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter article title"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={createFormData.category_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, category_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Author Selection */}
                <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Author *
                  </label>

                  {!showNewAuthor ? (
                    <div className="space-y-3">
                      <select
                        value={createFormData.author_id}
                        onChange={(e) => setCreateFormData({ ...createFormData, author_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select an author</option>
                        {authors.map((author) => (
                          <option key={author.id} value={author.id}>{author.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewAuthor(true)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        + Create new author
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">New Author</span>
                        <button
                          type="button"
                          onClick={() => { setShowNewAuthor(false); setAuthorPhotoFile(null); setAuthorPhotoPreview(''); }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Author Name *</label>
                        <input
                          type="text"
                          value={newAuthor.name}
                          onChange={(e) => setNewAuthor({ ...newAuthor, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Bio</label>
                        <textarea
                          value={newAuthor.bio}
                          onChange={(e) => setNewAuthor({ ...newAuthor, bio: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          rows={2}
                          placeholder="Short bio"
                        />
                      </div>

                      {/* Author Photo Upload */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Author Photo</label>
                        <div className="flex items-center gap-4">
                          {authorPhotoPreview ? (
                            <div className="relative">
                              <img
                                src={authorPhotoPreview}
                                alt="Author preview"
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => { setAuthorPhotoFile(null); setAuthorPhotoPreview(''); }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => authorPhotoInputRef.current?.click()}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Photo
                          </button>
                          <input
                            ref={authorPhotoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleAuthorPhotoSelect}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description / Excerpt
                  </label>
                  <textarea
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Brief description or excerpt"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <textarea
                    value={createFormData.content}
                    onChange={(e) => setCreateFormData({ ...createFormData, content: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                    rows={15}
                    placeholder="Write your article content here..."
                    required
                  />
                </div>

                {/* Thumbnail */}
                <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Thumbnail Image
                  </label>

                  <div className="space-y-4">
                    {/* Image preview */}
                    {(thumbnailPreview || createFormData.thumbnail_url) && (
                      <div className="relative inline-block">
                        <img
                          src={thumbnailPreview || createFormData.thumbnail_url}
                          alt="Thumbnail preview"
                          className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailFile(null);
                            setThumbnailPreview('');
                            setCreateFormData({ ...createFormData, thumbnail_url: '' });
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Upload button */}
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors"
                      >
                        <Image className="w-5 h-5" />
                        Upload Image File
                      </button>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                      />

                      <span className="self-center text-gray-400 text-sm">or</span>

                      {/* URL input */}
                      <input
                        type="url"
                        value={createFormData.thumbnail_url}
                        onChange={(e) => {
                          setCreateFormData({ ...createFormData, thumbnail_url: e.target.value });
                          setThumbnailFile(null);
                          setThumbnailPreview('');
                        }}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        placeholder="Paste image URL here"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Accepted formats: JPEG, PNG, WebP, GIF. Max 5MB.</p>
                  </div>
                </div>

                {/* SEO Section */}
                <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    SEO Settings
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">SEO Title</label>
                      <input
                        type="text"
                        value={createFormData.seo_title}
                        onChange={(e) => setCreateFormData({ ...createFormData, seo_title: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        placeholder="Custom title for search engines (defaults to article title)"
                        maxLength={70}
                      />
                      <p className="text-xs text-gray-500 mt-1">{createFormData.seo_title.length}/70 characters</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">SEO Keywords</label>
                      <input
                        type="text"
                        value={createFormData.seo_keywords}
                        onChange={(e) => setCreateFormData({ ...createFormData, seo_keywords: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        placeholder="keyword1, keyword2, keyword3"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated keywords for search engine optimization</p>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createFormData.is_featured}
                      onChange={(e) => setCreateFormData({ ...createFormData, is_featured: e.target.checked })}
                      className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Featured Article</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createFormData.is_trending}
                      onChange={(e) => setCreateFormData({ ...createFormData, is_trending: e.target.checked })}
                      className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Trending Article</span>
                  </label>
                </div>

                {/* Messages */}
                {error && (
                  <div className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                    Article published successfully! Redirecting...
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-4 border-t">
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
                    className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
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
