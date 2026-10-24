import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { newsroomAI, createDraftArticle, editLink, timeAgo, btnPrimary, card, type Draft } from './shared';

interface Item { id: string; title: string; created_at: string; is_published: boolean; is_manual: boolean | null; radar_score: number | null; news_sources: { name: string } | null }

/**
 * "This week in Nigeria, for Nigerians abroad": the editor ticks 8–10 of the
 * week's stories; the draft gives two lines on why each matters and links
 * to the full report — on CelebUD if we covered it, at the source if not.
 */
export function WeeklyDigest() {
  const [items, setItems] = useState<Item[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from('media_content')
        .select('id, title, created_at, is_published, is_manual, radar_score, news_sources(name)')
        .eq('media_type', 'article')
        .gte('created_at', since)
        .or('is_published.eq.true,radar_score.gte.6')
        .order('created_at', { ascending: false })
        .limit(150);
      setItems((data as unknown as Item[]) || []);
    })();
  }, []);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 15 ? p : [...p, id]));

  const run = async () => {
    setBusy('Writing why each story matters…'); setError(null); setDraft(null); setSavedId(null);
    try { setDraft((await newsroomAI<{ draft: Draft }>('digest_notes', { ids: picked })).draft); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
  };

  const save = async () => {
    if (!draft) return;
    setBusy('Saving…');
    try { setSavedId(await createDraftArticle(draft, { categorySlug: 'news' })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Newspaper className="w-5 h-5 text-red-600" /> Weekly digest</h2>
        <p className="text-sm text-gray-600 mt-1">
          Tick the 8–10 stories from this week that matter most to Nigerians abroad (3 minimum, 15 maximum). Stories we haven't covered link to the original report, which is honest and fine.
          It also makes a good newsletter edition.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <button className={btnPrimary} onClick={run} disabled={picked.length < 3 || !!busy}>Draft digest from {picked.length} stories</button>
          {busy && <span className="text-sm text-gray-600">{busy}</span>}
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {draft && (
        <div className={card}>
          <h3 className="font-bold text-gray-900">{draft.title}</h3>
          <div className="article-rich-content text-sm bg-gray-50 rounded-lg p-3 mt-2 max-h-[28rem] overflow-auto" dangerouslySetInnerHTML={{ __html: draft.content }} />
          <div className="mt-3">
            {savedId
              ? <Link className={btnPrimary} to={editLink(savedId)}>Open the digest to review and publish</Link>
              : <button className={btnPrimary} onClick={save} disabled={!!busy}>Save as hidden draft</button>}
          </div>
          <p className="text-xs text-gray-500 mt-2">Add one line of your own at the top — what stood out to you this week — before publishing.</p>
        </div>
      )}

      <div className={`${card} p-0 divide-y divide-gray-100`}>
        {items.map((it) => (
          <label key={it.id} className="flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" className="mt-1" checked={picked.includes(it.id)} onChange={() => toggle(it.id)} />
            <span className="min-w-0">
              <span className="text-sm font-medium text-gray-900">{it.title}</span>
              <span className="block text-xs text-gray-500">
                {it.is_published ? (it.is_manual ? 'CelebUD original' : 'On CelebUD') : `Not covered — links to ${it.news_sources?.name || 'source'}`}
                {it.radar_score != null && ` · radar ${it.radar_score}/10`} · {timeAgo(it.created_at)}
              </span>
            </span>
          </label>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-500 p-5">No stories from the last 7 days yet.</p>}
      </div>
    </div>
  );
}
