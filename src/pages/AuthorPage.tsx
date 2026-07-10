// src/pages/AuthorPage.tsx
// Public author profile at /author/:id — photo, bio, and every article
// under that byline. Clickable bylines + author pages are a core
// E-E-A-T/Google News trust signal.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { buildArticleUrl } from '../utils/articleUrl';
import { ArrowLeft, Clock, Newspaper, User } from 'lucide-react';

interface Author {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface AuthorArticle {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string;
  categories: { name: string } | null;
}

export function AuthorPage() {
  const { id } = useParams<{ id: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [articles, setArticles] = useState<AuthorArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: authorData }, { data: articleData }] = await Promise.all([
        supabase.from('authors').select('id, name, avatar_url, bio').eq('id', id).maybeSingle(),
        supabase
          .from('media_content')
          .select('id, slug, title, description, thumbnail_url, published_at, categories(name)')
          .eq('author_id', id)
          .order('published_at', { ascending: false })
          .limit(30),
      ]);
      setAuthor((authorData as Author) || null);
      setArticles((articleData as unknown as AuthorArticle[]) || []);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-44 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>

          {loading && <p className="text-center text-gray-500 py-16">Loading…</p>}

          {!loading && !author && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Author not found.</p>
            </div>
          )}

          {!loading && author && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {author.avatar_url ? (
                  <img
                    src={author.avatar_url}
                    alt={author.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
                    <User className="w-10 h-10 text-red-400" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">CelebUD Reporter</p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{author.name}</h1>
                  {author.bio && <p className="text-gray-600 mt-2 leading-relaxed">{author.bio}</p>}
                  <p className="flex items-center gap-1.5 text-sm text-gray-400 mt-2">
                    <Newspaper className="w-4 h-4" />
                    {articles.length} article{articles.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {articles.map((a) => (
                  <Link
                    key={a.id}
                    to={buildArticleUrl(a)}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
                  >
                    {a.thumbnail_url && (
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img
                          src={a.thumbnail_url}
                          alt={a.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {a.categories && (
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wide">{a.categories.name}</span>
                      )}
                      <h3 className="font-semibold text-gray-900 line-clamp-2 mt-1 group-hover:text-red-600 transition-colors">
                        {a.title}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(a.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
