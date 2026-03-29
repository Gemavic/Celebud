import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MediaContentWithRelations } from '../lib/database.types';
import { Header } from '../components/Header';
import CommentsSection from '../components/CommentsSection';
import { AdBanner } from '../components/AdBanner';
import { formatDistanceToNow } from '../utils/date';
import { updateMetaTags, generateArticleStructuredData, removeArticleStructuredData } from '../utils/seo';
import { sanitizeArticleContent } from '../utils/contentSanitizer';
import { ArrowLeft, Clock, Share2, Facebook, Twitter, Linkedin, ExternalLink } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useArticle } from '../hooks/useArticles';

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: article, isLoading: loading } = useArticle(id || '');
  const [relatedArticles, setRelatedArticles] = useState<MediaContentWithRelations[]>([]);

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
      await supabase.rpc('increment_article_views', { article_id: id });
    };

    incrementViews();
  }, [id]);

  useEffect(() => {
    if (!article) return;

    updateMetaTags({
      title: `${article.title} - CelebUD`,
      description: article.description || article.title,
      keywords: `${article.categories?.name || 'celebrity news'}, entertainment, celebrity, news`,
      image: article.thumbnail_url || undefined,
      url: `/article/${id}`,
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
      publishedDate: article.published_at,
      modifiedDate: article.updated_at,
      url: `${window.location.origin}/article/${id}`,
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
        alert('Link copied to clipboard!');
      }).catch(() => {
        alert('Failed to copy link');
      });
    } else {
      alert('Clipboard not supported in this browser');
    }
  }, []);

  const contentParagraphs = useMemo(() => {
    if (!article) return [];
    const raw = article.content || article.description || '';
    return sanitizeArticleContent(raw)
      .split('\n')
      .filter(para => para.trim());
  }, [article]);

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

      <article className="pt-40 pb-16" itemScope itemType="https://schema.org/NewsArticle">
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
                    <p className="font-medium text-gray-900 text-sm" itemProp="name">{article.authors.name}</p>
                    <p className="text-xs text-gray-500">Reporter</p>
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

          {article.thumbnail_url && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
              <img
                src={article.thumbnail_url}
                alt={article.title}
                className="w-full h-auto object-cover"
                itemProp="image"
              />
            </div>
          )}

          <div className="prose prose-lg max-w-none mb-12" itemProp="articleBody">
            {contentParagraphs.length > 0 ? (
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
                  return (
                    <p key={index} className="leading-loose text-justify">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-600 text-base mb-6">
                  This article is available from the original source.
                </p>
                {article.external_url && (
                  <a
                    href={article.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
                  >
                    <span>Read Full Article</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {article.external_url && contentParagraphs.length > 0 && (
              <div className="mt-6">
                <a
                  href={article.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-sm text-red-600 hover:text-red-700 transition-colors font-medium"
                >
                  <span>View original source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 border-y border-gray-200 mb-12 bg-gray-50 px-5 rounded-lg">
            <p className="text-gray-700 font-medium text-base mb-4 sm:mb-0">Share this article</p>
            <div className="flex items-center space-x-2">
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
                className="p-2.5 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm"
                aria-label="Share on Twitter"
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
              <button
                onClick={handleCopyLink}
                className="p-2.5 rounded-full bg-gray-700 text-white hover:bg-gray-800 transition-colors shadow-sm"
                aria-label="Copy link"
              >
                <Share2 className="w-4 h-4" />
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

          <CommentsSection contentId={article.id} initialCount={article.comments_count || 0} />
        </div>
      </article>
    </div>
  );
}
