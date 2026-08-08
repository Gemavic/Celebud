// src/pages/WatchPage.tsx
//
// The public page for a Content Studio video or audio clip, at /watch/:id.
//
// It exists so there is something on celebud.com to SHARE. The Studio share
// buttons used to post the raw storage file, so Facebook and X displayed
// "bwtrtzvlqvykobmlfjcl.supabase.co" with a blank preview — an .mp4 carries
// no title, description or image for a scraper to read. Sharing this page
// instead gives the clip a real CelebUD URL, and the prerender function
// serves crawlers the matching Open Graph tags.
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { updateMetaTags } from '../utils/seo';
import { getVideoEmbedUrl } from '../utils/videoEmbed';
import { formatDistanceToNow } from '../utils/date';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';

interface WatchItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  external_url: string | null;
  created_at: string;
  status: string;
}

export function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<WatchItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('creator_content')
        .select('id, title, description, content_type, media_url, thumbnail_url, external_url, created_at, status')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      setItem((data as WatchItem) || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!item) return;
    const isAudio = item.content_type === 'audio';
    updateMetaTags({
      title: `${item.title} | CelebUD`,
      description:
        (item.description || '').trim() ||
        `${isAudio ? 'Listen' : 'Watch'} "${item.title}" on CelebUD.`,
      image: item.thumbnail_url || undefined,
      // updateMetaTags treats this as a path and prefixes the origin.
      url: `/watch/${item.id}`,
    });
  }, [item]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!item || item.status !== 'published') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Not available</h1>
          <Link to="/" className="text-red-600 font-medium hover:text-red-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isAudio = item.content_type === 'audio';
  // Only our own uploads can be played inline; anything else is a link out.
  const ownFile = !!item.media_url?.includes('/storage/v1/object/public/');
  const embedUrl = !ownFile ? getVideoEmbedUrl(item.media_url) : null;
  const linkOut = item.external_url || item.media_url;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-black">
              {ownFile && isAudio && (
                <div className="p-8">
                  <audio controls src={item.media_url!} className="w-full" />
                </div>
              )}
              {ownFile && !isAudio && (
                <video
                  controls
                  playsInline
                  poster={item.thumbnail_url || undefined}
                  src={item.media_url!}
                  className="w-full max-h-[70vh]"
                />
              )}
              {!ownFile && embedUrl && (
                <div className="aspect-video">
                  <iframe
                    src={embedUrl}
                    title={item.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {!ownFile && !embedUrl && item.thumbnail_url && (
                <img src={item.thumbnail_url} alt={item.title} className="w-full" />
              )}
            </div>

            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
              <p className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                <Clock className="w-4 h-4" />
                {formatDistanceToNow(item.created_at)}
              </p>
              {item.description && (
                <p className="text-gray-700 leading-relaxed mt-4 whitespace-pre-line">
                  {item.description}
                </p>
              )}
              {!ownFile && !embedUrl && linkOut && (
                <a
                  href={linkOut}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
                >
                  View the original
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
