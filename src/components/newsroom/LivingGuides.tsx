import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { editLink, btnSecondary, card } from './shared';

interface Guide {
  id: string; title: string; published_at: string; content_updated_at: string | null;
  views_count: number | null; categories: { name: string; slug: string } | null;
}

const GUIDE_CATEGORIES = ['fin-advisor', 'finance', 'immigration', 'education', 'health', 'legal', 'business'];
const DUE_DAYS = 120;

/**
 * Hand-written guides kept current. Readers see "Updated <date>" on a guide
 * only when an editor has actually reviewed it here — not on every save.
 */
export function LivingGuides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('media_content')
      .select('id, title, published_at, content_updated_at, views_count, categories!inner(name, slug)')
      .eq('media_type', 'article')
      .eq('is_published', true)
      .eq('is_manual', true)
      .in('categories.slug', GUIDE_CATEGORIES)
      .order('views_count', { ascending: false })
      .limit(60);
    const rows = (data as unknown as Guide[]) || [];
    const last = (g: Guide) => new Date(g.content_updated_at || g.published_at).getTime();
    rows.sort((a, b) => last(a) - last(b));
    setGuides(rows);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const markReviewed = async (g: Guide) => {
    const now = new Date().toISOString();
    await supabase.from('media_content').update({ content_updated_at: now }).eq('id', g.id);
    setGuides((gs) => gs.map((x) => (x.id === g.id ? { ...x, content_updated_at: now } : x)));
  };

  const age = (g: Guide) => Math.floor((Date.now() - new Date(g.content_updated_at || g.published_at).getTime()) / 86400000);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><BookOpenCheck className="w-5 h-5 text-red-600" /> Living guides</h2>
        <p className="text-sm text-gray-600 mt-1">
          Your hand-written guides, oldest review first. Every few months, open one, check the figures, rules and dates are still right, then press
          <strong> Mark reviewed today</strong>. The guide then shows <em>“Updated {fmt(new Date().toISOString())}”</em> to readers and to Google.
          Only press it after a real review — the date is a promise to readers.
        </p>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : (
        <div className={`${card} p-0 divide-y divide-gray-100`}>
          {guides.map((g) => {
            const days = age(g); const due = days > DUE_DAYS;
            return (
              <div key={g.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{g.title}</p>
                  <p className="text-xs text-gray-500">
                    {g.categories?.name} · {(g.views_count ?? 0).toLocaleString()} views ·{' '}
                    {g.content_updated_at ? `reviewed ${fmt(g.content_updated_at)}` : `published ${fmt(g.published_at)}, never reviewed`}
                    {due && <span className="ml-1 font-bold text-amber-700">· due for review</span>}
                  </p>
                </div>
                <Link to={editLink(g.id)} className={btnSecondary}>Edit</Link>
                <button onClick={() => markReviewed(g)} className={btnSecondary} disabled={days === 0 && !!g.content_updated_at}>
                  <CheckCircle className="w-4 h-4" /> {days === 0 && g.content_updated_at ? 'Reviewed today' : 'Mark reviewed today'}
                </button>
              </div>
            );
          })}
          {guides.length === 0 && <p className="text-sm text-gray-500 p-5">No hand-written guides found.</p>}
        </div>
      )}
    </div>
  );
}
