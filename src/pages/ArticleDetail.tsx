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
              className="inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase text-white mb-4"
              style={{ backgroundColor: article.categories.color }}
            >
              {article.categories.name}
            </span>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 pb-8 border-b-2 border-gray-100">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              {article.authors && (
                <>
                  <img
                    src={article.authors.avatar_url || ''}
                    alt={article.authors.name}
                    className="w-14 h-14 rounded-full border-2 border-red-100 shadow-md"
                  />
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{article.authors.name}</p>
                    <p className="text-sm text-gray-600">{article.authors.role}</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-6 text-gray-600 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-red-600" />
                <span className="font-medium">{formatDistanceToNow(article.published_at)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-red-600" />
                <span className="font-medium">{((article.views_count || 0) / 1000).toFixed(1)}K views</span>
              </div>
            </div>
          </div>

          {article.thumbnail_url && (
            <div className="mb-10 rounded-2xl overflow-hidden shadow-xl">
              <img
                src={article.thumbnail_url}
                alt={article.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          <article className="prose prose-lg max-w-none mb-12">
            {article.content ? (
              <div className="text-gray-800 text-lg leading-relaxed space-y-6">
                {article.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-justify">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div className="text-gray-800 text-lg leading-relaxed space-y-6">
                {article.description.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-justify">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {article.source_url && (
              <div className="mt-10 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-semibold text-gray-700 mb-3">Source</p>
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 font-medium break-all inline-flex items-center"
                >
                  Read the original article
                  <span className="ml-2">→</span>
                </a>
              </div>
            )}
          </article>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-8 border-y-2 border-gray-100 mb-12 bg-gray-50 px-6 rounded-xl">
            <p className="text-gray-800 font-bold text-lg mb-4 sm:mb-0">Share this article</p>
            <div className="flex items-center space-x-3">
              <button
                className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all hover:scale-110 shadow-md"
                aria-label="Share on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </button>
              <button
                className="p-3 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-all hover:scale-110 shadow-md"
                aria-label="Share on Twitter"
              >
                <Twitter className="w-5 h-5" />
              </button>
              <button
                className="p-3 rounded-full bg-blue-700 text-white hover:bg-blue-800 transition-all hover:scale-110 shadow-md"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </button>
              <button
                className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-800 transition-all hover:scale-110 shadow-md"
                aria-label="Copy link"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {relatedArticles.length > 0 && (
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b-2 border-gray-100">
                You Might Also Like
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    to={`/article/${related.id}`}
                    className="group block"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                      <div className="relative overflow-hidden h-48">
                        <img
                          src={related.thumbnail_url || ''}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 text-lg mb-3 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">
                          {related.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
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
