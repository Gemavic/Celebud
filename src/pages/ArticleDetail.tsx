import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MediaContentWithRelations } from '../lib/database.types';
import { Header } from '../components/Header';
import { formatDistanceToNow } from '../utils/date';
import { ArrowLeft, Eye, Clock, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<MediaContentWithRelations | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<MediaContentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadArticle(id);
    }
  }, [id]);

  async function loadArticle(articleId: string) {
    try {
      const { data, error } = await supabase
        .from('media_content')
        .select('*, categories(*), authors(*)')
        .eq('id', articleId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setArticle(data as MediaContentWithRelations);

        await supabase
          .from('media_content')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', articleId);

        if (data.category_id) {
          const { data: related } = await supabase
            .from('media_content')
            .select('*, categories(*), authors(*)')
            .eq('category_id', data.category_id)
            .neq('id', articleId)
            .limit(3);

          if (related) {
            setRelatedArticles(related as MediaContentWithRelations[]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading article:', error);
    } finally {
      setLoading(false);
    }
  }

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

      <article className="pt-32 pb-16">
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
              className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white mb-4"
              style={{ backgroundColor: article.categories.color }}
            >
              {article.categories.name}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-5 leading-snug">
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
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{article.authors.name}</p>
                    <p className="text-xs text-gray-500">{article.authors.role}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4 text-gray-500 text-xs">
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDistanceToNow(article.published_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{((article.views_count || 0) / 1000).toFixed(1)}K views</span>
              </div>
            </div>
          </div>

          {article.thumbnail_url && (
            <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
              <img
                src={article.thumbnail_url}
                alt={article.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          <div className="prose prose-lg max-w-none mb-12">
            <div className="text-gray-700 text-base leading-relaxed space-y-5">
              {(article.content || article.description)
                .split('\n')
                .filter(para => para.trim())
                .map((paragraph, index) => (
                  <p key={index} className="leading-loose text-justify">
                    {paragraph}
                  </p>
                ))
              }
            </div>

            {article.external_url && (
              <div className="mt-10 p-5 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Original Source</p>
                <a
                  href={article.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 text-sm break-all inline-flex items-center"
                >
                  View original article at source
                  <span className="ml-1">→</span>
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
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
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
        </div>
      </article>
    </div>
  );
}
