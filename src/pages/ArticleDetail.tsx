import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MediaContentWithRelations } from '../lib/database.types';
import { Header } from '../components/Header';
import CommentsSection from '../components/CommentsSection';
import { AdBanner } from '../components/AdBanner';
import { GoogleAd } from '../components/GoogleAd';
import { formatDistanceToNow } from '../utils/date';
import { updateMetaTags, generateArticleStructuredData, removeArticleStructuredData } from '../utils/seo';
import { sanitizeArticleContent } from '../utils/contentSanitizer';
import { isHtmlContent } from '../utils/articleContent';
import { buildArticleUrl } from '../utils/articleUrl';
import DOMPurify from 'dompurify';
import { ArrowLeft, Clock, Share2, Facebook, Twitter, Linkedin, Instagram, Check } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useArticle } from '../hooks/useArticles';

export function ArticleDetail() {
  const { id, slug } = useParams<{ id: string; slug?: string }>();
  const navigate = useNavigate();
  const { data: article, isLoading: loading, isError, refetch } = useArticle(id || '');
  const [relatedArticles, setRelatedArticles] = useState<MediaContentWithRelations[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  // Curated stories from other outlets carry a "The post ... appeared
  // first on X" footer. Detect it so the byline reads "Curator" and the
  // original publisher is credited prominently (a Google News
  // attribution requirement).
  const syndicationSource = useMemo(() => {
    const text = (article?.content || '') + ' ' + (article?.description || '');
    const match = text.match(/appeared first on\s+(?:<a[^>]*>)?\s*([^<.\n]{2,60})/i);
    return match ? match[1].trim() : null;
  }, [article]);

  useEffect(() => {
    if (!id || !article) return;

    const loadRelatedArticles = async () => {
      if (article.category_id) {
        const { data: related } = await supabase
          .from('media_content')
          .select('*, categories(*), authors(*)')
          .eq('category_id', article.category_id)
          .neq('id', id)
          .limit(3);

        if (related) {
          setRelatedArticles(related as MediaContentWithRelations[]);
        }
      }
    };

    loadRelatedArticles();
  }, [id, article]);

  useEffect(() => {
    if (!id) return;

    const incrementViews = async () => {
      await supabase.rpc('increment_article_views_with_meta' as any, {
        p_article_id: id,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent || null,
      });
    };

    incrementViews();
  }, [id]);

  useEffect(() => {
    if (!article) return;

    // If someone lands on a bare /article/:id link (an old share, a
    // bookmark, a backlink) or on a stale slug, quietly upgrade the URL
    // to the canonical slugged version without a page reload. Google
    // treats this as the same article throughout — the id never changes.
    const canonicalPath = buildArticleUrl(article);
    const currentSlugSegment = slug ? `/${slug}` : '';
    if (canonicalPath !== `/article/${id}${currentSlugSegment}`) {
      navigate(canonicalPath, { replace: true });
    }
  }, [article, id, slug, navigate]);

  useEffect(() => {
    if (!article) return;

    const canonicalPath = buildArticleUrl(article);

    updateMetaTags({
      title: `${article.title} - CelebUD`,
      description: article.description || article.title,
      keywords: `${article.categories?.name || 'celebrity news'}, entertainment, celebrity, news`,
      image: article.thumbnail_url || undefined,
      url: canonicalPath,
      type: 'article',
      author: article.authors?.name || 'CelebUD',
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
    });

    generateArticleStructuredData({
      title: article.title,
      description: article.description || article.title,
      image: article.thumbnail_url || undefined,
      author: article.authors?.name || 'CelebUD',
      authorSlug: article.authors?.name?.toLowerCase().replace(/\s+/g, '-'),
      publishedDate: article.published_at,
      modifiedDate: article.updated_at,
      url: `${window.location.origin}${canonicalPath}`,
    });

    return () => {
      removeArticleStructuredData();
    };
  }, [article, id]);

  useEffect(() => {
    if (!id || !article) return;

    const channel = supabase
      .channel(`article-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_content',
          filter: `id=eq.${id}`,
        },
        () => {
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [id, article]);

  const handleCopyLink = useCallback(() => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      }).catch(() => {
        alert('Failed to copy link');
      });
    } else {
      alert('Clipboard not supported in this browser');
    }
  }, []);

  // Instagram has no public "share this link" mechanism (true for every
  // website, not a CelebUD gap) - the only way a browser can hand a link
  // and image to Instagram is the OS's native share sheet, which lists
  // Instagram (Stories/Direct/Feed) alongside WhatsApp, Messages, etc.
  // when the app is installed. On desktop / unsupported browsers, fall
  // back to copying the link with an Instagram-specific instruction.
  const handleInstagramShare = useCallback(async () => {
    if (!article) return;
    const shareUrl = window.location.href;
    const shareData: ShareData = { title: article.title, text: article.title, url: shareUrl };

    if (article.thumbnail_url && navigator.canShare) {
      try {
        const res = await fetch(article.thumbnail_url);
        const blob = await res.blob();
        const file = new File([blob], 'celebud-article.jpg', { type: blob.type || 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ ...shareData, files: [file] });
          return;
        }
      } catch {
        // Image fetch/share failed (CORS, unsupported type, user cancelled) - fall through
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed - fall through to copy
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied! Instagram doesn\'t support direct links from browsers - paste this into your Story, bio, or a DM.');
      });
    }
  }, [article]);

  // Content is stored in two formats: legacy plain text (paragraphs split
  // on newline, `[IMAGE:url]` markers for inline images) from before the
  // rich text editor existed, and real HTML from the current editor. Detect
  // which one this article has and render through the matching path so old
  // articles keep working exactly as before.
  const rawContent = article ? (article.content || article.description || '') : '';
  const useHtmlContent = isHtmlContent(rawContent);

  const sanitizedHtml = useMemo(() => {
    if (!article || !useHtmlContent) return '';
    return DOMPurify.sanitize(rawContent, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
        'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr',
        'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel', 'class'],
    });
  }, [article, useHtmlContent, rawContent]);

  const contentParagraphs = useMemo(() => {
    if (!article || useHtmlContent) return [];
    return sanitizeArticleContent(rawContent)
      .split('\n')
      .filter(para => para.trim());
  }, [article, useHtmlContent, rawContent]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading article...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="pt-32 px-4 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Could not load article</h1>
          <p className="text-gray-500 mb-6">The server is taking longer than usual. This may be a temporary issue — please try again.</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="pt-32 px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Header />

      <article id="main-content" className="pt-40 pb-16" itemScope itemType="https://schema.org/NewsArticle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-red-600 font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>

          {article.categories && (
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold text-white mb-6 shadow-md"
              style={{ backgroundColor: article.categories.color }}
            >
              {article.categories.name}
            </span>
          )}

          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-5 leading-tight" itemProp="headline">
            {article.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 mb-4 sm:mb-0">
              {article.authors && (
                <>
                  <img
                    src={article.authors.avatar_url || ''}
                    alt={article.authors.name}
                    className="w-11 h-11 rounded-full border border-gray-200"
                    itemProp="image"
                  />
                  <div itemProp="author" itemScope itemType="https://schema.org/Person">
                    <Link
                      to={`/author/${article.authors.id}`}
                      className="font-medium text-gray-900 text-sm hover:text-red-600 transition-colors"
                      itemProp="name"
                    >
                      {article.authors.name}
                    </Link>
                    <p className="text-xs text-gray-500">{syndicationSource ? 'Curator' : 'Reporter'}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4 text-gray-500 text-xs">
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <time itemProp="datePublished" dateTime={article.published_at}>
                  {formatDistanceToNow(article.published_at)}
                </time>
              </div>
            </div>
          </div>

          {syndicationSource && (
            <div className="mb-6 -mt-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              Originally published by <strong className="text-gray-800">{syndicationSource}</strong> — curated
              for CelebUD readers under our <Link to="/editorial-standards" className="text-red-600 hover:text-red-700 font-medium">editorial standards</Link>.
            </div>
          )}

          {article.thumbnail_url && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
              <img
                src={article.thumbnail_url}
                alt={`${article.title}.`}
                className="w-full h-auto object-cover"
                loading="eager"
                width={800}
                height={450}
                sizes="(max-width: 768px) 100vw, 800px"
                itemProp="image"
              />
            </div>
          )}

          <div className="prose prose-lg max-w-none mb-12" itemProp="articleBody">
            {useHtmlContent && sanitizedHtml ? (
              <>
                <div
                  className="article-rich-content text-gray-700 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
                <GoogleAd slot="MID_ARTICLE_AD_SLOT" format="rectangle" className="my-6" />
              </>
            ) : contentParagraphs.length > 0 ? (
              <div className="text-gray-700 text-base leading-relaxed space-y-5">
                {contentParagraphs.map((paragraph, index) => {
                  if (paragraph.startsWith('[IMAGE:') && paragraph.endsWith(']')) {
                    const imageUrl = paragraph.slice(7, -1);
                    return (
                      <div key={index} className="my-6 rounded-lg overflow-hidden">
                        <img
                          src={imageUrl}
                          alt="Article content"
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    );
                  }

                  const showMidArticleAd = index === Math.floor(contentParagraphs.length / 3) && contentParagraphs.length > 5;

                  return (
                    <div key={index}>
                      <p className="leading-loose text-justify">
                        {paragraph}
                      </p>
                      {showMidArticleAd && (
                        <GoogleAd slot="MID_ARTICLE_AD_SLOT" format="rectangle" className="my-6" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                {article.external_url ? (
                  <>
                    <p className="text-gray-600 text-base mb-4">
                      This article is available from the original source.
                    </p>
                    <a
                      href={article.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-md"
                    >
                      <span>Read Full Article</span>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </a>
                  </>
                ) : (
                  <p className="text-gray-600 text-base">
                    Article content is currently unavailable.
                  </p>
                )}
              </div>
            )}
          </div>

          {article.authors?.bio && (
            <div className="mb-8 p-5 bg-gray-50 border border-gray-200 rounded-xl flex gap-4">
              <img
                src={article.authors.avatar_url || ''}
                alt={article.authors.name}
                className="w-14 h-14 rounded-full border border-gray-200 flex-shrink-0"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">About the Author</p>
                <Link
                  to={`/author/${article.authors.id}`}
                  className="font-semibold text-gray-900 hover:text-red-600 transition-colors"
                >
                  {article.authors.name}
                </Link>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{article.authors.bio}</p>
              </div>
            </div>
          )}

          {article.authors?.disclaimer && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-800 leading-relaxed">{article.authors.disclaimer}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 border-y border-gray-200 mb-12 bg-gray-50 px-5 rounded-lg">
            <p className="text-gray-700 font-medium text-base mb-4 sm:mb-0">Share this article</p>
            <div className="flex items-center space-x-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(article.title + ' - Read on CelebUD: ' + window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
                aria-label="Share on WhatsApp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                aria-label="Share on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-black text-white hover:bg-gray-800 transition-colors shadow-sm"
                aria-label="Share on X"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-sm"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm"
                aria-label="Share on Telegram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 12 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <button
                onClick={handleInstagramShare}
                className="p-2.5 rounded-full text-white transition-opacity hover:opacity-90 shadow-sm"
                style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
                aria-label="Share to Instagram or more apps"
                title="Share to Instagram / more apps"
              >
                <Instagram className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyLink}
                className={`p-2.5 rounded-full text-white transition-colors shadow-sm ${linkCopied ? 'bg-emerald-600' : 'bg-gray-700 hover:bg-gray-800'}`}
                aria-label="Copy link"
                title={linkCopied ? 'Copied!' : 'Copy link'}
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {relatedArticles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    to={`/article/${related.id}`}
                    className="group block"
                  >
                    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                      <div className="relative overflow-hidden h-40">
                        <img
                          src={related.thumbnail_url || ''}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug">
                          {related.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {related.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="my-12">
            <AdBanner placement="article" />
          </div>

          <GoogleAd slot="ARTICLE_BOTTOM_AD_SLOT" format="horizontal" className="my-8" />

          <CommentsSection contentId={article.id} initialCount={article.comments_count || 0} />
        </div>
      </article>
    </div>
  );
}
