import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';
import { RecategorizeArticle } from '../components/RecategorizeArticle';
import { RichTextEditor } from '../components/RichTextEditor';
import { toEditableHtml } from '../utils/articleContent';
import { getVideoEmbedUrl, getVideoThumbnail, isEmbeddableVideoUrl } from '../utils/videoEmbed';
import { Search, Filter, RefreshCw, Eye, Calendar, Pencil, Trash2, X, Save, CheckCircle, Share2, Send, Copy, CheckCheck, Facebook, MessageCircle, Bell, Plus, Sparkles, AlertTriangle, Image as ImageIcon, Video, FileText, Pin, Archive } from 'lucide-react';
import { formatDistanceToNow } from '../utils/date';

// Posts to the CelebUD Facebook Page + Telegram channel via the
// share-to-socials edge function on the Celebud project (fully migrated
// off the old Gemavic Academy project; the FACEBOOK_PAGE_ACCESS_TOKEN,
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID secrets live here now).
// Function must be deployed with JWT verification off; open CORS.
const SHARE_ENDPOINT = 'https://bwtrtzvlqvykobmlfjcl.supabase.co/functions/v1/dynamic-worker';

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
  bio: string | null;
  disclaimer: string | null;
  auto_bio_enabled: boolean;
}

interface BioProfile {
  id: string;
  author_id: string;
  label: string;
  bio: string | null;
  disclaimer: string | null;
  category_slugs: string[];
  is_default: boolean;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  author_id: string | null;
  author_bio_snapshot: string | null;
  author_disclaimer_snapshot: string | null;
  media_type: string | null;
  external_url: string | null;
  published_at: string;
  views_count: number;
  comments_count: number;
  is_featured: boolean;
  is_trending: boolean;
  /** Pinned articles stay on the site until an editor removes them. */
  is_pinned?: boolean;
  /** Written in-house — never eligible for automated rewriting. */
  is_manual?: boolean | null;
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
  const { canApportionArticles } = usePermissions();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  // Article rebuild (AI re-reporting + SEO + thumbnails), run in batches.
  const [enriching, setEnriching] = useState(false);
  const [enrichStop, setEnrichStop] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichDone, setEnrichDone] = useState(0);
  const [enrichRemaining, setEnrichRemaining] = useState<number | null>(null);
  // AI images cost roughly 8x a text rewrite, so they stay off unless asked.
  const [enrichImages, setEnrichImages] = useState(false);
  const [enrichQueue, setEnrichQueue] = useState<number | null>(null);
  // 'high-value' rewrites only the categories worth paying for (~40% of the
  // queue); 'all' rewrites everything including sports and celebrity wire.
  const [enrichScope, setEnrichScope] = useState<'high-value' | 'all'>('high-value');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [bioProfiles, setBioProfiles] = useState<BioProfile[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    content: '',
    thumbnail_url: '',
    category_id: '',
    author_id: '',
    media_type: 'article',
    external_url: '',
    is_featured: false,
    is_trending: false,
    is_pinned: false,
    seo_title: '',
    seo_keywords: '',
  });
  const [saving, setSaving] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  const [illustrating, setIllustrating] = useState(false);
  const [illustrateProgress, setIllustrateProgress] = useState<{ done: number; total: number } | null>(null);
  const [illustrateError, setIllustrateError] = useState<string | null>(null);
  const [selectedBioProfileId, setSelectedBioProfileId] = useState('');
  const [articleBioForm, setArticleBioForm] = useState({ bio: '', disclaimer: '' });
  const [bioGenerating, setBioGenerating] = useState(false);
  const [bioGenError, setBioGenError] = useState<string | null>(null);
  const [bioAiGenerated, setBioAiGenerated] = useState(false);
  const [saveProfileEnabled, setSaveProfileEnabled] = useState(false);
  const [saveProfileLabel, setSaveProfileLabel] = useState('');
  const [saveProfileCategorySlugs, setSaveProfileCategorySlugs] = useState<string[]>([]);
  const [savingBioProfile, setSavingBioProfile] = useState(false);
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
  // Shared by bulk archive and bulk delete.
  const [bulkWorking, setBulkWorking] = useState(false);
  // Which single article is being rewritten by hand right now.
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchCategories();
      fetchAuthors();
      fetchBioProfiles();
      fetchArticles();
    }
  }, [profile, selectedCategory]);

  const fetchBioProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('author_bio_profiles')
        .select('id, author_id, label, bio, disclaimer, category_slugs, is_default')
        .order('label');
      if (error) throw error;
      setBioProfiles(data || []);
    } catch (err) {
      console.error('Error fetching bio profiles:', err);
    }
  };

  // Picks the profile whose category_slugs include the article's category,
  // else that author's default/general profile, else null (blank) —
  // mirrors the same fallback logic used server-side in fetch-news.
  // Keeps the Stop button responsive: the batch loop below reads this ref,
  // which updates immediately, rather than state captured in its closure.
  const enrichStopRef = useRef(false);

  /**
   * Rebuilds fetched articles into properly written stories with SEO and
   * matching thumbnails. The edge function handles one batch per call and
   * reports how many are left, so this keeps calling it until the queue is
   * empty (or the admin stops it). Safe to stop and resume — finished
   * articles are marked and never reprocessed.
   */
  // How many articles still need rebuilding, so the cost is visible upfront.
  // Must mirror HIGH_VALUE_CATEGORIES in the enrich-articles function so the
  // count and cost shown here describe the same articles it will process.
  const HIGH_VALUE_SLUGS = [
    'fin-advisor', 'finance', 'business', 'immigration',
    'health', 'legal', 'education', 'politics',
  ];

  const loadEnrichQueue = async (scope: 'high-value' | 'all') => {
    let q = supabase
      .from('media_content')
      .select(scope === 'all' ? 'id' : 'id, categories!inner(slug)', { count: 'exact', head: true })
      .eq('media_type', 'article')
      .or('is_manual.is.null,is_manual.eq.false')
      .not('external_url', 'is', null)
      .is('enriched_at', null)
      .lt('enrichment_attempts', 2);
    if (scope === 'high-value') q = q.in('categories.slug', HIGH_VALUE_SLUGS);
    const { count } = await q;
    setEnrichQueue(count ?? 0);
  };

  useEffect(() => { loadEnrichQueue(enrichScope); }, [enrichScope]);

  /**
   * @param maxArticles stop after roughly this many (a measured test run);
   *                    omit to work through the whole queue.
   */
  const runEnrichment = async (maxArticles?: number) => {
    setEnriching(true);
    setEnrichStop(false);
    enrichStopRef.current = false;
    setEnrichError(null);
    setEnrichDone(0);
    setEnrichStatus('Starting…');

    let totalDone = 0;
    let totalFailed = 0;
    // Measured from Google's token counts, not estimated.
    let totalCost = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be signed in as an admin to do this.');
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-articles`;

      for (;;) {
        if (enrichStopRef.current) {
          setEnrichStatus(`Stopped. ${totalDone} article${totalDone === 1 ? '' : 's'} rebuilt so far.`);
          break;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit: maxArticles ? Math.min(maxArticles, 30) : 30,
            withImages: enrichImages,
            scope: enrichScope,
          }),
        });

        const data: {
          error?: string; processed?: number; failed?: number;
          remaining?: number; errors?: string[]; billingStopped?: boolean;
          usage?: { costUsd?: number; costPerArticleUsd?: number; thoughtTokens?: number };
        } = await response.json();

        totalCost += data.usage?.costUsd || 0;

        if (!response.ok) throw new Error(data.error || `Rebuild failed (status ${response.status}).`);

        // Out of Google credit: stop straight away rather than keep calling
        // and racking up failures.
        if (data.billingStopped) {
          setEnrichRemaining(data.remaining ?? 0);
          throw new Error(
            `Stopped: your Google AI credit is exhausted. ${totalDone + (data.processed || 0)} articles were rebuilt before this. Top up at aistudio.google.com, then press Start rebuild again — nothing already finished will be charged twice.`
          );
        }

        totalDone += data.processed || 0;
        totalFailed += data.failed || 0;
        setEnrichDone(totalDone);
        setEnrichRemaining(data.remaining ?? 0);

        // Measured test run: stop after the sample so the real per-article
        // cost can be checked before committing to the whole archive.
        if (maxArticles && totalDone >= maxArticles) {
          const each = totalDone > 0 ? totalCost / totalDone : 0;
          setEnrichStatus(
            `Test run: ${totalDone} rebuilt for $${totalCost.toFixed(3)} — that is $${each.toFixed(4)} per article. ` +
            `The remaining ${(data.remaining ?? 0).toLocaleString()} would cost about $${((data.remaining ?? 0) * each).toFixed(2)}.`
          );
          break;
        }

        if (!data.remaining || data.remaining <= 0) {
          setEnrichStatus(`Finished. ${totalDone} article${totalDone === 1 ? '' : 's'} rebuilt${totalFailed ? `, ${totalFailed} skipped` : ''} — actual cost $${totalCost.toFixed(2)}.`);
          break;
        }

        // A batch that manages nothing at all means every article in it
        // failed — stop rather than spinning through the whole archive.
        if ((data.processed || 0) === 0 && (data.failed || 0) > 0) {
          throw new Error(data.errors?.[0] || 'Every article in this batch failed — stopping.');
        }

        setEnrichStatus(`Rebuilt ${totalDone} — actual spend so far $${totalCost.toFixed(2)}. ${data.remaining.toLocaleString()} to go.`);
      }

      await fetchArticles();
    } catch (err: unknown) {
      setEnrichError(err instanceof Error ? err.message : 'Rebuild failed');
    } finally {
      setEnriching(false);
    }
  };

  /**
   * Rewrites ONE article, chosen by hand.
   *
   * Automatic rewriting is switched off — articles are published as short
   * attributed teasers and stay that way until someone decides a particular
   * story is worth the cost. This is that decision, one article at a time.
   */
  const rewriteOne = async (article: Article) => {
    setRewritingId(article.id);
    setNotifyResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be signed in as an admin.');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-articles`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          // ids targets exactly this article and nothing else.
          body: JSON.stringify({ ids: [article.id], withImages: false }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Rewrite failed (${res.status}).`);

      if (data.billingStopped) {
        throw new Error('Google AI credit is exhausted — top up at aistudio.google.com.');
      }
      if (!data.processed) {
        throw new Error(
          data.errors?.[0] ||
          'Nothing was rewritten — the source page may be paywalled or too short to work from.'
        );
      }

      const cost = data.usage?.costUsd;
      setNotifyResult(
        `Rewritten${cost ? ` — cost $${cost.toFixed(3)}` : ''}. Refreshing…`
      );
      await fetchArticles();
    } catch (err) {
      setNotifyResult(`Error: ${err instanceof Error ? err.message : 'Rewrite failed'}`);
    } finally {
      setRewritingId(null);
      setTimeout(() => setNotifyResult(null), 6000);
    }
  };

  const resolveBioProfileFor = (authorId: string, categoryId: string): BioProfile | null => {
    // Authors opted out of automatic bios are never auto-filled; their bio
    // must be picked or typed deliberately on each article.
    if (authors.find((a) => a.id === authorId)?.auto_bio_enabled === false) return null;
    const categorySlug = categories.find((c) => c.id === categoryId)?.slug;
    const authorProfiles = bioProfiles.filter((p) => p.author_id === authorId);
    const match = categorySlug ? authorProfiles.find((p) => (p.category_slugs || []).includes(categorySlug)) : undefined;
    const fallback = authorProfiles.find((p) => p.is_default);
    return match || fallback || null;
  };

  const fetchAuthors = async () => {
    try {
      const { data, error } = await supabase
        .from('authors')
        .select('id, name, bio, disclaimer, auto_bio_enabled')
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
          author_bio_snapshot,
          author_disclaimer_snapshot,
          media_type,
          external_url,
          published_at,
          views_count,
          comments_count,
          is_featured,
          is_trending,
          is_pinned,
          is_manual,
          seo_title,
          seo_keywords,
          categories:category_id (
            id,
            name,
            slug
          )
        `)
        .in('media_type', ['article', 'video'])
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

  const resetBioPanel = () => {
    setSelectedBioProfileId('');
    setArticleBioForm({ bio: '', disclaimer: '' });
    setBioGenerating(false);
    setBioGenError(null);
    setBioAiGenerated(false);
    setSaveProfileEnabled(false);
    setSaveProfileLabel('');
    setSaveProfileCategorySlugs([]);
  };

  const openEditor = (article: Article) => {
    setEditingArticle(article);
    setEditForm({
      title: article.title || '',
      description: article.description || '',
      content: toEditableHtml(article.content || ''),
      thumbnail_url: article.thumbnail_url || '',
      category_id: article.category_id || '',
      author_id: article.author_id || '',
      media_type: article.media_type || 'article',
      external_url: article.external_url || '',
      is_featured: article.is_featured || false,
      is_trending: article.is_trending || false,
      is_pinned: article.is_pinned || false,
      seo_title: article.seo_title || '',
      seo_keywords: article.seo_keywords || '',
    });

    resetBioPanel();
    if (article.author_bio_snapshot || article.author_disclaimer_snapshot) {
      setArticleBioForm({
        bio: article.author_bio_snapshot || '',
        disclaimer: article.author_disclaimer_snapshot || '',
      });
      const matching = bioProfiles.find(
        (p) => p.author_id === article.author_id && p.bio === article.author_bio_snapshot && p.disclaimer === article.author_disclaimer_snapshot
      );
      if (matching) setSelectedBioProfileId(matching.id);
    } else if (article.author_id) {
      const resolved = resolveBioProfileFor(article.author_id, article.category_id || '');
      if (resolved) {
        setSelectedBioProfileId(resolved.id);
        setArticleBioForm({ bio: resolved.bio || '', disclaimer: resolved.disclaimer || '' });
      }
    }
  };

  const openNewArticle = () => {
    setIsCreatingNew(true);
    setAiTopic('');
    setAiNotes('');
    setAiError(null);
    setAiGenerated(false);
    setEditForm({
      title: '',
      description: '',
      content: '',
      thumbnail_url: '',
      category_id: '',
      author_id: '',
      media_type: 'article',
      external_url: '',
      is_featured: false,
      is_trending: false,
      seo_title: '',
      seo_keywords: '',
    });
    resetBioPanel();
  };

  const closeEditor = () => {
    setEditingArticle(null);
    setIsCreatingNew(false);
    resetBioPanel();
  };

  // When the category changes mid-edit, re-suggest the matching profile —
  // but don't clobber a bio the admin already typed/generated.
  const handleCategoryChange = (categoryId: string) => {
    const updatedForm = { ...editForm, category_id: categoryId };
    setEditForm(updatedForm);
    if (updatedForm.author_id && !articleBioForm.bio && !articleBioForm.disclaimer) {
      const resolved = resolveBioProfileFor(updatedForm.author_id, categoryId);
      if (resolved) {
        setSelectedBioProfileId(resolved.id);
        setArticleBioForm({ bio: resolved.bio || '', disclaimer: resolved.disclaimer || '' });
      }
    }
  };

  const handleAuthorChange = (authorId: string) => {
    setEditForm({ ...editForm, author_id: authorId });
    resetBioPanel();
    const resolved = resolveBioProfileFor(authorId, editForm.category_id);
    if (resolved) {
      setSelectedBioProfileId(resolved.id);
      setArticleBioForm({ bio: resolved.bio || '', disclaimer: resolved.disclaimer || '' });
    }
  };

  const selectBioProfile = (profileId: string) => {
    setSelectedBioProfileId(profileId);
    setBioAiGenerated(false);
    if (!profileId) {
      setArticleBioForm({ bio: '', disclaimer: '' });
      return;
    }
    const profile = bioProfiles.find((p) => p.id === profileId);
    setArticleBioForm({ bio: profile?.bio || '', disclaimer: profile?.disclaimer || '' });
  };

  const generateArticleBio = async () => {
    if (!editForm.author_id) {
      setBioGenError('Pick an author first.');
      return;
    }
    setBioGenerating(true);
    setBioGenError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be signed in as an admin to do this.');

      const author = authors.find((a) => a.id === editForm.author_id);
      const defaultProfile = bioProfiles.find((p) => p.author_id === editForm.author_id && p.is_default);
      const categoryName = categories.find((c) => c.id === editForm.category_id)?.name;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-author-bio`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: author?.name || 'Staff Writer',
          expertiseContext: defaultProfile?.bio || author?.bio || '',
          articleTitle: editForm.title || '(untitled)',
          articleCategory: categoryName,
          articleExcerpt: (editForm.description || editForm.content || '').slice(0, 600),
        }),
      });

      const data: { error?: string; bio?: string; disclaimer?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to generate bio (status ${response.status}).`);

      setArticleBioForm({ bio: data.bio || '', disclaimer: data.disclaimer || '' });
      setSelectedBioProfileId('');
      setBioAiGenerated(true);
    } catch (err: unknown) {
      setBioGenError(err instanceof Error ? err.message : 'Failed to generate bio');
    } finally {
      setBioGenerating(false);
    }
  };

  const toggleSaveProfileCategory = (slug: string) => {
    setSaveProfileCategorySlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const saveBioProfileNow = async () => {
    if (!editForm.author_id || !saveProfileLabel.trim()) return;
    setSavingBioProfile(true);
    try {
      const { data, error } = await supabase
        .from('author_bio_profiles')
        .insert({
          author_id: editForm.author_id,
          label: saveProfileLabel.trim(),
          bio: articleBioForm.bio || '',
          disclaimer: articleBioForm.disclaimer || '',
          category_slugs: saveProfileCategorySlugs,
          is_default: false,
        })
        .select('id, author_id, label, bio, disclaimer, category_slugs, is_default')
        .single();
      if (error) throw error;
      setBioProfiles((prev) => [...prev, data]);
      setSelectedBioProfileId(data.id);
      setSaveProfileEnabled(false);
      setSaveProfileLabel('');
      setSaveProfileCategorySlugs([]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSavingBioProfile(false);
    }
  };

  const generateDraft = async () => {
    if (!aiTopic.trim()) {
      setAiError('Enter a topic or brief first');
      return;
    }
    setAiGenerating(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAiError('You must be signed in as an admin to do this');
        return;
      }

      // Deployed on Supabase under the dashboard-assigned name "quick-task"
      // (its URL slug is fixed regardless of the display "Name" field).
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-task`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: aiTopic, notes: aiNotes || undefined }),
      });

      let data: { error?: string; draft?: Record<string, string> };
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server returned an unexpected response (status ${response.status}). Check the function's logs in Supabase.`);
      }

      if (!response.ok || !data.draft) {
        throw new Error(data.error || `Failed to generate draft (status ${response.status}, no error detail returned).`);
      }

      const draft = data.draft;
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === (draft.suggested_category || '').toLowerCase()
      );

      setEditForm({
        title: draft.title || '',
        description: draft.description || '',
        content: toEditableHtml(draft.content || ''),
        thumbnail_url: '',
        category_id: matchedCategory?.id || '',
        author_id: '',
        media_type: 'article',
        external_url: '',
        is_featured: false,
        is_trending: false,
        seo_title: draft.seo_title || '',
        seo_keywords: draft.seo_keywords || '',
      });
      setAiGenerated(true);
    } catch (err: unknown) {
      console.error('Error generating draft:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate draft';
      setAiError(msg);
    } finally {
      setAiGenerating(false);
    }
  };

  const uploadThumbnail = async (file: File) => {
    setThumbnailUploading(true);
    setThumbnailUploadError(null);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `article-thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw new Error(error.message);

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
      setEditForm((prev) => ({ ...prev, thumbnail_url: urlData.publicUrl }));
    } catch (err: unknown) {
      console.error('Error uploading thumbnail:', err);
      setThumbnailUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setThumbnailUploading(false);
    }
  };

  // Pasting a YouTube/Vimeo/TikTok link auto-fills the thumbnail (YouTube
  // only, where a predictable thumbnail URL exists) and defaults the
  // category to "Video" — both only when not already set, so it never
  // overwrites something the editor already chose.
  const handleVideoUrlChange = (url: string) => {
    setEditForm((prev) => {
      const next = { ...prev, external_url: url };
      if (!prev.thumbnail_url) {
        const auto = getVideoThumbnail(url);
        if (auto) next.thumbnail_url = auto;
      }
      if (!prev.category_id) {
        const videoCategory = categories.find((c) => c.slug === 'video');
        if (videoCategory) next.category_id = videoCategory.id;
      }
      return next;
    });
  };

  const generateThumbnail = async () => {
    if (!editForm.title.trim()) {
      setThumbnailUploadError('Add a title first so the AI knows what to illustrate.');
      return;
    }
    setThumbnailGenerating(true);
    setThumbnailUploadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setThumbnailUploadError('You must be signed in as an admin to do this.');
        return;
      }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editForm.title, description: editForm.description || undefined }),
      });
      let data: { url?: string; error?: string };
      try {
        data = await resp.json();
      } catch {
        throw new Error(`Server returned an unexpected response (status ${resp.status}).`);
      }
      if (!resp.ok || !data.url) {
        throw new Error(data.error || `Failed to generate thumbnail (status ${resp.status}).`);
      }
      setEditForm((prev) => ({ ...prev, thumbnail_url: data.url as string }));
    } catch (err: unknown) {
      console.error('Error generating thumbnail:', err);
      setThumbnailUploadError(err instanceof Error ? err.message : 'Thumbnail generation failed');
    } finally {
      setThumbnailGenerating(false);
    }
  };

  // Matches the "[Suggested image: ...]" placeholder paragraphs the AI
  // drafter leaves in the body where it couldn't invent a real photo.
  const SUGGESTED_IMAGE_RE = /<p>\s*<em>\s*\[Suggested image:\s*([^\]]*)\]\s*<\/em>\s*<\/p>/gi;

  const suggestedImageCount = useMemo(
    () => [...editForm.content.matchAll(SUGGESTED_IMAGE_RE)].length,
    [editForm.content]
  );

  const fillSuggestedImages = async () => {
    const matches = [...editForm.content.matchAll(SUGGESTED_IMAGE_RE)];
    if (matches.length === 0) return;

    setIllustrating(true);
    setIllustrateError(null);
    setIllustrateProgress({ done: 0, total: matches.length });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIllustrateError('You must be signed in as an admin to do this.');
        return;
      }

      const results: (string | null)[] = [];
      for (let i = 0; i < matches.length; i++) {
        const desc = matches[i][1].trim();
        try {
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagePrompt: desc }),
          });
          const data: { url?: string; error?: string } = await resp.json();
          if (!resp.ok || !data.url) throw new Error(data.error || `status ${resp.status}`);
          results.push(data.url);
        } catch (err) {
          console.error('Inline image generation failed for suggestion:', desc, err);
          results.push(null);
        }
        setIllustrateProgress({ done: i + 1, total: matches.length });
      }

      let idx = 0;
      const updatedContent = editForm.content.replace(SUGGESTED_IMAGE_RE, (fullMatch, desc: string) => {
        const url = results[idx];
        idx++;
        if (!url) return fullMatch; // leave the text suggestion in place if this one failed
        const alt = desc.trim().replace(/"/g, '&quot;');
        return `<img src="${url}" alt="${alt}" class="rounded-lg max-w-full h-auto my-4" />`;
      });
      setEditForm((f) => ({ ...f, content: updatedContent }));

      const failures = results.filter((r) => r === null).length;
      if (failures > 0) {
        setIllustrateError(`${failures} of ${matches.length} image${matches.length === 1 ? '' : 's'} could not be generated — the text suggestion was left in place for those.`);
      }
    } finally {
      setIllustrating(false);
      setIllustrateProgress(null);
    }
  };

  const saveArticle = async () => {
    if (!editingArticle && !isCreatingNew) return;
    setSaving(true);
    try {
      const slug = editForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 180);

      const payload = {
        title: editForm.title,
        slug,
        description: editForm.description || null,
        content: editForm.content || null,
        thumbnail_url: editForm.thumbnail_url || null,
        category_id: editForm.category_id || null,
        author_id: editForm.author_id || null,
        author_bio_snapshot: articleBioForm.bio || null,
        author_disclaimer_snapshot: articleBioForm.disclaimer || null,
        media_type: editForm.media_type,
        external_url: editForm.external_url || null,
        is_featured: editForm.is_pinned ? true : editForm.is_featured,
        is_pinned: editForm.is_pinned,
        is_trending: editForm.is_trending,
        seo_title: editForm.seo_title || null,
        seo_keywords: editForm.seo_keywords || null,
        // Anything written or edited here is newsroom work. This flag is what
        // keeps automated passes (the article rebuild) away from it — without
        // it the rebuild rewrote hand-written pieces and replaced their
        // photos. Also stamped as already-enriched so it can never be queued.
        is_manual: true,
        enriched_at: new Date().toISOString(),
      };

      const { error } = editingArticle
        ? await supabase.from('media_content').update(payload).eq('id', editingArticle.id)
        : await supabase.from('media_content').insert(payload);

      if (error) throw error;

      setEditingArticle(null);
      setIsCreatingNew(false);
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

  /**
   * Pins or unpins the selected articles.
   *
   * Pinning makes an article permanent on the site: the nightly
   * update_trending_featured_flags() job may not un-feature it, and it appears
   * in the public Originals collection. Pinning implies featured, matching the
   * safety net in the database function.
   *
   * Use it selectively — pinning everything would make "featured" meaningless
   * and clutter the homepage.
   */
  const bulkSetPinned = async (pinned: boolean) => {
    const ids = [...selectedArticles];
    if (ids.length === 0) return;

    if (pinned && !confirm(
      `Pin ${ids.length} article${ids.length === 1 ? '' : 's'} permanently?\n\n` +
      `They will stay featured on the site and appear in CelebUD Originals ` +
      `until you unpin, archive or delete them. Nothing automatic can remove them.`
    )) return;

    setBulkWorking(true);
    setBulkProgress({ done: 0, total: ids.length, results: [] });
    const results: string[] = [];
    let done = 0;

    const payload = pinned
      ? { is_pinned: true, is_featured: true, last_featured_at: new Date().toISOString() }
      : { is_pinned: false };

    // Chunked so a long selection cannot time out mid-way.
    const CHUNK = 50;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('media_content').update(payload).in('id', chunk);
      results.push(
        error
          ? `FAILED (${chunk.length}): ${error.message}`
          : `${pinned ? 'Pinned' : 'Unpinned'} ${chunk.length}`
      );
      done += chunk.length;
      setBulkProgress({ done, total: ids.length, results: [...results] });
    }

    setBulkWorking(false);
    setSelectedArticles(new Set());
    await fetchArticles();
  };

  /**
   * Moves the selected articles into media_content_archive and removes them
   * from the live site. Fully reversible from Admin -> Recovery, which is why
   * this is the default bulk action rather than deletion.
   */
  const bulkArchive = async () => {
    const ids = [...selectedArticles];
    if (ids.length === 0) return;
    if (!confirm(
      `Archive ${ids.length} article${ids.length === 1 ? '' : 's'}?\n\n` +
      `They will come off the site but stay fully recoverable from ` +
      `Admin → Recovery. Nothing is permanently lost.`
    )) return;

    setBulkWorking(true);
    setBulkProgress({ done: 0, total: ids.length, results: [] });
    const results: string[] = [];
    let done = 0;

    for (const id of ids) {
      const article = articles.find((a) => a.id === id);
      try {
        // Copy the full row across first, then remove the original — if the
        // copy fails we must not delete anything.
        const { data: row, error: readErr } = await supabase
          .from('media_content').select('*').eq('id', id).maybeSingle();
        if (readErr || !row) throw new Error(readErr?.message || 'could not read article');

        const { error: copyErr } = await supabase
          .from('media_content_archive')
          .upsert({ ...row, archived_at: new Date().toISOString() });
        if (copyErr) throw new Error(`archive copy failed: ${copyErr.message}`);

        const { error: delErr } = await supabase.from('media_content').delete().eq('id', id);
        if (delErr) throw new Error(`removal failed: ${delErr.message}`);

        results.push(`Archived: ${article?.title?.slice(0, 50) || id}`);
      } catch (err) {
        results.push(`FAILED: ${article?.title?.slice(0, 40) || id} — ${err instanceof Error ? err.message : 'error'}`);
      }
      done++;
      setBulkProgress({ done, total: ids.length, results: [...results] });
    }

    setBulkWorking(false);
    setSelectedArticles(new Set());
    await fetchArticles();
  };

  /**
   * Permanent deletion with no archive copy. Requires typing DELETE, because
   * unlike archiving there is no way back from this.
   */
  const bulkDelete = async () => {
    const ids = [...selectedArticles];
    if (ids.length === 0) return;

    const typed = prompt(
      `PERMANENTLY DELETE ${ids.length} article${ids.length === 1 ? '' : 's'}?\n\n` +
      `This cannot be undone and leaves no archive copy. ` +
      `If you might want them back, cancel and use Archive instead.\n\n` +
      `Type DELETE to confirm:`
    );
    if (typed !== 'DELETE') return;

    setBulkWorking(true);
    setBulkProgress({ done: 0, total: ids.length, results: [] });
    const results: string[] = [];
    let done = 0;

    // Deleted in chunks so one long list cannot time out mid-way.
    const CHUNK = 25;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const { error } = await supabase.from('media_content').delete().in('id', chunk);
      results.push(error ? `FAILED (${chunk.length}): ${error.message}` : `Deleted ${chunk.length}`);
      done += chunk.length;
      setBulkProgress({ done, total: ids.length, results: [...results] });
    }

    setBulkWorking(false);
    setSelectedArticles(new Set());
    await fetchArticles();
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Article Management</h1>
          <p className="text-gray-600">Manage, edit, and recategorize articles across your platform</p>
        </div>
        <button
          onClick={openNewArticle}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Article
        </button>
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

      {/* Rebuild fetched articles into full stories with SEO + thumbnails */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Rebuild fetched articles
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Nothing is rewritten automatically. Articles are published as short excerpts that
              credit and link to the original source, and stay that way until you choose otherwise —
              use <strong>Rewrite</strong> on an individual article, or select several and rebuild
              them here. Your hand-written articles are never touched, and you can stop any time
              and pick up where you left off.
            </p>

            {enrichQueue !== null && (
              <div className="mt-3 text-sm">
                <div className="flex flex-wrap gap-2 mb-3">
                  {([
                    ['high-value', 'Valuable categories only'],
                    ['all', 'Every category'],
                  ] as Array<['high-value' | 'all', string]>).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setEnrichScope(key)}
                      disabled={enriching}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors disabled:opacity-60 ${
                        enrichScope === key
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">{enrichQueue.toLocaleString()}</span> article
                  {enrichQueue === 1 ? '' : 's'} left to rebuild — estimated cost{' '}
                  <span className="font-semibold">
                    ${(enrichQueue * (enrichImages ? 0.044 : 0.005)).toFixed(2)}
                  </span>{' '}
                  {enrichImages ? 'with AI images' : 'text and SEO only'}.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {enrichScope === 'high-value'
                    ? 'Finance, business, immigration, health, legal, education and politics — where a rewrite holds its value. Sports and celebrity wire stay as short attributed teasers.'
                    : 'Includes sports and celebrity wire stories, which go stale within a day.'}
                </p>
                <label className="mt-2 inline-flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrichImages}
                    disabled={enriching}
                    onChange={(e) => setEnrichImages(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">
                    Also generate unique AI images for featured and trending stories
                    <span className="text-gray-500"> — about 8x the cost per article</span>
                  </span>
                </label>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {enriching && (
              <button
                onClick={() => { enrichStopRef.current = true; setEnrichStop(true); }}
                disabled={enrichStop}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {enrichStop ? 'Stopping…' : 'Stop'}
              </button>
            )}
            <button
              onClick={() => runEnrichment(10)}
              disabled={enriching}
              className="px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition-colors"
              title="Rebuild 10 articles and report the exact cost per article"
            >
              Test 10 first
            </button>
            <button
              onClick={() => runEnrichment()}
              disabled={enriching}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {enriching
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Rebuilding…</>
                : <><Sparkles className="w-4 h-4" /> Start rebuild</>}
            </button>
          </div>
        </div>

        {(enrichStatus || enrichError) && (
          <div className="mt-4">
            {enrichError ? (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {enrichError}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-700">{enrichStatus}</p>
                {enrichRemaining !== null && enrichRemaining > 0 && (
                  <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, (enrichDone / Math.max(1, enrichDone + enrichRemaining)) * 100)}%` }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
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
                <button
                  onClick={() => bulkSetPinned(true)}
                  disabled={bulkWorking || bulkPosting}
                  title="Keep these on the site permanently and show them in CelebUD Originals"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Pin className="w-4 h-4" /> Pin {selectedArticles.size}
                </button>
                <button
                  onClick={() => bulkSetPinned(false)}
                  disabled={bulkWorking || bulkPosting}
                  title="Remove the permanent pin — the article stays on the site but can lose homepage placement after 30 days"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Unpin
                </button>
                <button
                  onClick={bulkArchive}
                  disabled={bulkWorking || bulkPosting}
                  title="Take these off the site but keep them fully recoverable from Admin → Recovery"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  {bulkWorking
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> {bulkProgress?.done}/{bulkProgress?.total}</>
                    : <><Archive className="w-4 h-4" /> Archive {selectedArticles.size}</>
                  }
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={bulkWorking || bulkPosting}
                  title="Permanent — no archive copy is kept"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete {selectedArticles.size}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate flex items-center gap-2">
                      {article.media_type === 'video' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-full flex-shrink-0">
                          <Video className="w-3 h-3" /> Video
                        </span>
                      )}
                      {article.is_pinned && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-amber-800 bg-amber-100 rounded-full flex-shrink-0"
                          title="Pinned — stays on the site until you unpin or archive it"
                        >
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <span className="truncate">{article.title}</span>
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
                          {canApportionArticles ? (
                            <>
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
                          ) : (
                            <span className="text-xs text-gray-400 italic">| Article assignment requires elevated access</span>
                          )}
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
                    {article.external_url && !article.is_manual && (
                      <button
                        onClick={() => rewriteOne(article)}
                        disabled={rewritingId === article.id}
                        title="Rewrite just this article with AI (about 2 cents). Nothing else is touched."
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        {rewritingId === article.id
                          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Rewriting…</>
                          : <><Sparkles className="w-4 h-4" /> Rewrite</>}
                      </button>
                    )}
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
      {(editingArticle || isCreatingNew) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-gray-900">{editingArticle ? 'Edit Article' : 'New Article'}</h2>
              <button
                onClick={closeEditor}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {isCreatingNew && (
                <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    <h3 className="font-semibold text-gray-900">Generate a draft with AI</h3>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="Topic or headline, e.g. 'Drake announces surprise Toronto pop-up show'"
                      className="w-full px-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <textarea
                      value={aiNotes}
                      onChange={(e) => setAiNotes(e.target.value)}
                      placeholder="Optional: paste research notes, quotes, or specific facts to include"
                      rows={3}
                      className="w-full px-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y text-sm"
                    />
                    <button
                      onClick={generateDraft}
                      disabled={aiGenerating || !aiTopic.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      {aiGenerating ? 'Writing draft...' : 'Generate draft'}
                    </button>
                    {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                  </div>
                </div>
              )}

              {aiGenerated && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">AI-generated draft — review before publishing</p>
                    <p className="mt-0.5">Check every fact, quote, and name below. Add a thumbnail and pick the right author before saving.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, media_type: 'article' }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      editForm.media_type === 'article'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Article
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, media_type: 'video' }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      editForm.media_type === 'video'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Video
                  </button>
                </div>
              </div>

              {editForm.media_type === 'video' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Video URL</label>
                  <input
                    type="url"
                    value={editForm.external_url}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    placeholder="Paste a YouTube, Vimeo, or TikTok link"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {editForm.external_url && !isEmbeddableVideoUrl(editForm.external_url) && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      This link doesn't look like a YouTube, Vimeo, or TikTok video — it will show readers a
                      "Watch Video" button linking out, instead of playing inline.
                    </p>
                  )}
                  {editForm.external_url && getVideoEmbedUrl(editForm.external_url) && (
                    <div className="relative w-full mt-3 rounded-lg overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        src={getVideoEmbedUrl(editForm.external_url) || ''}
                        title="Video preview"
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}

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
                <RichTextEditor
                  value={editForm.content}
                  onChange={(html) => setEditForm((f) => ({ ...f, content: html }))}
                  placeholder="Write or paste your article here..."
                />
                {suggestedImageCount > 0 && (
                  <div className="mt-2 flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <button
                      type="button"
                      onClick={fillSuggestedImages}
                      disabled={illustrating}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-purple-700 bg-white border border-purple-300 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      <ImageIcon className="w-4 h-4" />
                      {illustrating
                        ? `Generating ${illustrateProgress?.done ?? 0}/${illustrateProgress?.total ?? suggestedImageCount}…`
                        : `Fill ${suggestedImageCount} suggested image${suggestedImageCount === 1 ? '' : 's'} with AI`}
                    </button>
                    <p className="text-xs text-purple-700">
                      The draft left {suggestedImageCount === 1 ? 'a spot' : 'spots'} for a photo — generate {suggestedImageCount === 1 ? 'it' : 'them'} now, or replace with a real photo yourself in the editor.
                    </p>
                  </div>
                )}
                {illustrateError && <p className="mt-1.5 text-sm text-red-600">{illustrateError}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thumbnail</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex-shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadThumbnail(file);
                          e.target.value = '';
                        }}
                        disabled={thumbnailUploading}
                      />
                      {thumbnailUploading ? 'Uploading...' : 'Upload from device'}
                    </label>
                    <button
                      type="button"
                      onClick={generateThumbnail}
                      disabled={thumbnailGenerating}
                      title="Create a conceptual thumbnail from the title & description (no real people)"
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      <Sparkles className="w-4 h-4" />
                      {thumbnailGenerating ? 'Generating…' : 'Generate with AI'}
                    </button>
                    <input
                      type="text"
                      value={editForm.thumbnail_url}
                      onChange={(e) => setEditForm({ ...editForm, thumbnail_url: e.target.value })}
                      className="flex-1 min-w-[10rem] px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="or paste an image URL"
                    />
                  </div>
                  {thumbnailUploadError && <p className="mt-1.5 text-sm text-red-600">{thumbnailUploadError}</p>}
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
                    onChange={(e) => handleCategoryChange(e.target.value)}
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
                  onChange={(e) => handleAuthorChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">— Unassigned —</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {editForm.author_id && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-gray-700">About the Author for this article</p>
                  <p className="text-xs text-gray-500">
                    Pick one of this author's saved profiles, or generate one tailored to this specific article. This is what shows on this article only — it won't change what shows on their other articles.
                  </p>

                  {bioProfiles.filter((p) => p.author_id === editForm.author_id).length > 0 && (
                    <select
                      value={selectedBioProfileId}
                      onChange={(e) => selectBioProfile(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">— Custom for this article —</option>
                      {bioProfiles
                        .filter((p) => p.author_id === editForm.author_id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}{p.is_default ? ' (default)' : ''}
                          </option>
                        ))}
                    </select>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">About the Author</label>
                    <textarea
                      value={articleBioForm.bio}
                      onChange={(e) => { setArticleBioForm({ ...articleBioForm, bio: e.target.value }); setSelectedBioProfileId(''); }}
                      rows={3}
                      placeholder="e.g. Matthew Ayandare is a licensed financial advisor..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Disclaimer (optional)</label>
                    <textarea
                      value={articleBioForm.disclaimer}
                      onChange={(e) => { setArticleBioForm({ ...articleBioForm, disclaimer: e.target.value }); setSelectedBioProfileId(''); }}
                      rows={2}
                      placeholder="e.g. This article is for educational purposes only and is not financial advice..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={generateArticleBio}
                      disabled={bioGenerating}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {bioGenerating ? 'Generating...' : 'Generate new bio for this article'}
                    </button>
                  </div>
                  {bioGenError && <p className="text-xs text-red-600">{bioGenError}</p>}

                  {bioAiGenerated && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p><span className="font-semibold">AI-generated bio — review before saving.</span> Edit above if needed.</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={saveProfileEnabled}
                        onChange={(e) => setSaveProfileEnabled(e.target.checked)}
                      />
                      Save this as a reusable profile for future articles
                    </label>
                    {saveProfileEnabled && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={saveProfileLabel}
                          onChange={(e) => setSaveProfileLabel(e.target.value)}
                          placeholder="Profile name, e.g. 'Fin-Advisor'"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {categories.map((cat) => (
                            <label key={cat.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={saveProfileCategorySlugs.includes(cat.slug)}
                                onChange={() => toggleSaveProfileCategory(cat.slug)}
                              />
                              {cat.name}
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={saveBioProfileNow}
                          disabled={savingBioProfile || !saveProfileLabel.trim()}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingBioProfile ? 'Saving...' : 'Save profile'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                <label className="flex items-center gap-2 cursor-pointer" title="Pinned articles stay on the site until you unpin or archive them. The nightly trending job cannot remove them.">
                  <input
                    type="checkbox"
                    checked={editForm.is_pinned}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_pinned: e.target.checked,
                        // Pinning implies featured; unpinning leaves the
                        // featured state alone so it can expire normally.
                        is_featured: e.target.checked ? true : editForm.is_featured,
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Pin permanently
                    <span className="block text-xs font-normal text-gray-500">Stays until you remove it</span>
                  </span>
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
                {saving ? 'Saving...' : editingArticle ? 'Save Changes' : 'Create Article'}
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
