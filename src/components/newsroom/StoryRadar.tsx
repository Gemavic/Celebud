import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radar, RefreshCw, ExternalLink, PenLine, Wand2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { newsroomAI, rewriteAsDraft, editLink, timeAgo, btnPrimary, btnSecondary, card } from './shared';

interface RadarRow {
  id: string;
  title: string;
  external_url: string | null;
  created_at: string;
  radar_score: number | null;
  radar_notes: { why?: string; summary?: string[]; questions?: string[]; who_to_ask?: string[] } | null;
  news_sources: { name: string } | null;
}

/**
 * The news feed as a tip sheet: incoming stories ranked by how much they
 * matter to CelebUD readers, each with the questions our own story should
 * answer. The editor chooses a handful a day to cover properly.
 */
export function StoryRadar() {
  const [rows, setRows] = useState<RadarRow[]>([]);
  const [unscored, setUnscored] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

  const since = () => new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();

  const load = useCallback(async () => {
    setLoading(true);
    const from = since();
    const [ranked, waiting] = await Promise.all([
      supabase
        .from('media_content')
        .select('id, title, external_url, created_at, radar_score, radar_notes, news_sources(name)')
        .eq('media_type', 'article').eq('is_published', false).eq('radar_dismissed', false)
        .not('external_url', 'is', null).is('enriched_at', null).gte('created_at', from)
        .not('radar_scored_at', 'is', null)
        .order('radar_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('media_content')
        .select('id', { count: 'exact', head: true })
        .eq('media_type', 'article').eq('is_published', false).eq('radar_dismissed', false)
        .not('external_url', 'is', null).is('enriched_at', null).gte('created_at', from)
        .is('radar_scored_at', null),
    ]);
    setRows((ranked.data as unknown as RadarRow[]) || []);
    setUnscored(waiting.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const score = async () => {
    setScoring(true); setMsg(null);
    try {
      const r = await newsroomAI<{ scored: number }>('radar_score');
      setMsg({ ok: true, text: r.scored ? `Ranked ${r.scored} new stories.` : 'No new stories to rank right now.' });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Ranking failed' });
    } finally { setScoring(false); }
  };

  const rewrite = async (row: RadarRow) => {
    setBusyId(row.id); setMsg(null);
    try {
      const r = await rewriteAsDraft(row.id);
      if (!r.processed || r.metadataOnly) throw new Error(r.errors?.[0] || 'The source was too thin to rewrite — write it yourself instead.');
      setMsg({ ok: true, text: `"${row.title}" is now a hidden draft. Open it, use Suggest angles and add your own line, then Save to publish.`, link: editLink(row.id) });
      setRows((rs) => rs.filter((x) => x.id !== row.id));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Rewrite failed' });
    } finally { setBusyId(null); }
  };

  const dismiss = async (row: RadarRow) => {
    setRows((rs) => rs.filter((x) => x.id !== row.id));
    await supabase.from('media_content').update({ radar_dismissed: true }).eq('id', row.id);
  };

  const tone = (s: number | null) =>
    (s ?? 0) >= 8 ? 'bg-green-100 text-green-800' : (s ?? 0) >= 6 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Radar className="w-5 h-5 text-red-600" /> Story Radar</h2>
          <p className="text-sm text-gray-600 mt-1">
            Incoming news from the last 4 days, ranked by how much it matters to our readers. Pick 3–5 a day to cover with our own angle.
            {unscored > 0 && <strong> {unscored} new {unscored === 1 ? 'story is' : 'stories are'} waiting to be ranked.</strong>}
          </p>
        </div>
        <button onClick={score} disabled={scoring || unscored === 0} className={btnPrimary}>
          <RefreshCw className={`w-4 h-4 ${scoring ? 'animate-spin' : ''}`} />
          {scoring ? 'Ranking…' : 'Rank new stories'}
        </button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text} {msg.link && <Link to={msg.link} className="font-semibold underline">Open the draft</Link>}
        </div>
      )}

      {loading ? <p className="text-sm text-gray-500">Loading…</p> : rows.length === 0 ? (
        <div className={card}><p className="text-sm text-gray-600">Nothing ranked yet. Press <strong>Rank new stories</strong>.</p></div>
      ) : rows.map((r) => (
        <div key={r.id} className={card}>
          <div className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${tone(r.radar_score)}`}>{r.radar_score ?? '–'}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900">{r.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {r.news_sources?.name || 'Source'} · {timeAgo(r.created_at)}
                {r.external_url && <> · <a href={r.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">original <ExternalLink className="w-3 h-3" /></a></>}
              </p>
              {r.radar_notes?.why && <p className="text-sm text-gray-800 mt-2"><strong>Why it matters:</strong> {r.radar_notes.why}</p>}
              {!!r.radar_notes?.summary?.length && (
                <ul className="mt-2 text-sm text-gray-600 list-disc pl-5">{r.radar_notes.summary.map((s) => <li key={s}>{s}</li>)}</ul>
              )}
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                {!!r.radar_notes?.questions?.length && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-bold uppercase text-amber-800">Our story should answer</p>
                    <ul className="text-sm text-amber-900 mt-1 list-disc pl-5">{r.radar_notes.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                  </div>
                )}
                {!!r.radar_notes?.who_to_ask?.length && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-bold uppercase text-blue-800">Who you could ask</p>
                    <ul className="text-sm text-blue-900 mt-1 list-disc pl-5">{r.radar_notes.who_to_ask.map((q) => <li key={q}>{q}</li>)}</ul>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => rewrite(r)} disabled={busyId === r.id} className={btnSecondary}>
                  <Wand2 className="w-4 h-4" /> {busyId === r.id ? 'Drafting…' : 'Rewrite as draft'}
                </button>
                <Link to={editLink(r.id)} className={btnSecondary}><PenLine className="w-4 h-4" /> Write it myself</Link>
                <button onClick={() => dismiss(r)} className={`${btnSecondary} text-gray-500`}><X className="w-4 h-4" /> Skip</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
