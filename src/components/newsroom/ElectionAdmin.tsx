import { useCallback, useEffect, useState } from 'react';
import { Vote, Sparkles, Save, Plus, Trash2, Upload, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Json } from '../../lib/database.types';
import { type Candidate, type Promise_, type Source, type VoterStat, asPromises, asSources, STATE_ZONE, STATES, POLL_SLUG, fmtNum } from '../../utils/election';
import { newsroomAI, btnPrimary, btnSecondary, input, card } from './shared';

interface Draft { party_name: string; running_mate: string; photo_url: string; bio: string; past_offices: string; search_terms: string; promises: Promise_[]; sources: Source[] }

/**
 * Newsroom > Election 2027. Every candidate is edited with the same form,
 * and "Research profile" applies the same neutral brief to all of them.
 */
export function ElectionAdmin() {
  const [cands, setCands] = useState<Candidate[]>([]);
  const [sel, setSel] = useState<Candidate | null>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [stats, setStats] = useState<VoterStat[]>([]);
  const [newState, setNewState] = useState({ label: '', value: '', source_url: '', source_title: '', as_of: new Date().toISOString().slice(0, 10) });
  const [poll, setPoll] = useState<{ id: string; is_open: boolean; total: number; lastDay: number } | null>(null);

  const load = useCallback(async () => {
    const [c, s, p] = await Promise.all([
      supabase.from('election_candidates').select('*').order('ballot_order'),
      supabase.from('election_voter_stats').select('*').eq('kind', 'state').order('value', { ascending: false }),
      supabase.from('election_polls').select('id, is_open').eq('slug', POLL_SLUG).maybeSingle(),
    ]);
    setCands((c.data as unknown as Candidate[]) || []);
    setStats((s.data as unknown as VoterStat[]) || []);
    if (p.data) {
      const since = new Date(Date.now() - 86400000).toISOString();
      const [{ count: total }, { count: lastDay }] = await Promise.all([
        supabase.from('election_poll_votes').select('id', { count: 'exact', head: true }).eq('poll_id', p.data.id),
        supabase.from('election_poll_votes').select('id', { count: 'exact', head: true }).eq('poll_id', p.data.id).gte('created_at', since),
      ]);
      setPoll({ id: p.data.id, is_open: p.data.is_open, total: total ?? 0, lastDay: lastDay ?? 0 });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (c: Candidate) => {
    setSel(c); setMsg(null);
    setD({
      party_name: c.party_name || '', running_mate: c.running_mate || '', photo_url: c.photo_url || '',
      bio: c.bio || '', past_offices: c.past_offices || '', search_terms: c.search_terms.join(', '),
      promises: asPromises(c.promises), sources: asSources(c.sources),
    });
  };

  const research = async () => {
    if (!sel || !d) return;
    setBusy('Researching current reporting — about 30 seconds…'); setMsg(null);
    try {
      const r = await newsroomAI<{ bio: string; past_offices: string; promises: Promise_[]; sources: Source[] }>('candidate_profile', { candidate_id: sel.id });
      const seen = new Set(d.sources.map((s) => s.url));
      setD({
        ...d,
        bio: r.bio || d.bio,
        past_offices: r.past_offices || d.past_offices,
        promises: [...d.promises, ...r.promises.filter((p) => !d.promises.some((q) => q.text === p.text))],
        sources: [...d.sources, ...r.sources.filter((s) => !seen.has(s.url))],
      });
      setMsg({ ok: true, text: 'Draft filled in below — nothing is saved yet. Check every line against its source, remove anything you can’t verify, then Save.' });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Research failed' }); } finally { setBusy(null); }
  };

  const uploadPhoto = async (f: File | undefined) => {
    if (!f || !sel || !d) return;
    setBusy('Uploading photo…');
    const path = `election-2027/${sel.slug}-${Date.now()}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`;
    const { error } = await supabase.storage.from('media').upload(path, f, { contentType: f.type, upsert: false });
    setBusy(null);
    if (error) { setMsg({ ok: false, text: `Photo upload failed: ${error.message}` }); return; }
    setD({ ...d, photo_url: supabase.storage.from('media').getPublicUrl(path).data.publicUrl });
  };

  const save = async () => {
    if (!sel || !d) return;
    setBusy('Saving…');
    const { error } = await supabase.from('election_candidates').update({
      party_name: d.party_name.trim() || null,
      running_mate: d.running_mate.trim() || null,
      photo_url: d.photo_url.trim() || null,
      bio: d.bio.trim() || null,
      past_offices: d.past_offices.trim() || null,
      search_terms: d.search_terms.split(',').map((t) => t.trim()).filter(Boolean),
      promises: d.promises.filter((p) => p.text.trim()) as unknown as Json,
      sources: d.sources.filter((s) => s.url.trim()) as unknown as Json,
      updated_at: new Date().toISOString(),
    }).eq('id', sel.id);
    setBusy(null);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: `Saved. Live at celebud.com/election-2027/${sel.slug}` });
    load();
  };

  const addState = async () => {
    const value = Number(newState.value.replace(/,/g, ''));
    if (!STATE_ZONE[newState.label] || !value || !newState.source_url) { setMsg({ ok: false, text: 'Pick a state, enter the figure, and give the source link.' }); return; }
    const { error } = await supabase.from('election_voter_stats').upsert({
      kind: 'state', label: newState.label, zone: STATE_ZONE[newState.label], value, sort: 99,
      as_of: newState.as_of, source_url: newState.source_url, source_title: newState.source_title || 'INEC register figures',
    }, { onConflict: 'kind,label' });
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setNewState({ ...newState, label: '', value: '' }); load();
  };

  const togglePoll = async () => {
    if (!poll) return;
    await supabase.from('election_polls').update({ is_open: !poll.is_open }).eq('id', poll.id);
    load();
  };

  const filled = (c: Candidate) => !!c.bio;

  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Vote className="w-5 h-5 text-red-600" /> Election 2027</h2>
          <p className="text-sm text-gray-600 mt-1">
            Public hub: <a href="/election-2027" target="_blank" className="underline">celebud.com/election-2027</a> · poll: <a href="/election-2027/poll" target="_blank" className="underline">/election-2027/poll</a>.
            Give every candidate the same treatment — {cands.filter(filled).length} of {cands.length} profiles written.
          </p>
        </div>
        {poll && (
          <div className="text-sm text-right">
            <p><strong>{fmtNum(poll.total)}</strong> votes · {fmtNum(poll.lastDay)} in the last 24 h</p>
            <button onClick={togglePoll} className={`${btnSecondary} mt-1`}>{poll.is_open ? 'Close poll' : 'Reopen poll'}</button>
          </div>
        )}
      </div>
      {msg && <div className={`p-3 rounded-lg text-sm ${msg.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          {cands.map((c) => (
            <button key={c.id} onClick={() => open(c)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between ${sel?.id === c.id ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <span><span className="text-gray-400 mr-1">{c.ballot_order}.</span><span className="font-semibold">{c.name}</span> <span className="text-gray-500">{c.party_abbr}</span></span>
              <span className={`text-xs font-bold ${filled(c) ? 'text-green-700' : 'text-amber-700'}`}>{filled(c) ? '✓ profile' : 'empty'}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {sel && d ? (
            <div className={`${card} space-y-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-gray-900">{sel.name} <span className="text-gray-500 font-normal">({sel.party_abbr})</span></h3>
                <button onClick={research} disabled={!!busy} className={btnSecondary}><Sparkles className="w-4 h-4" /> Research profile</button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-semibold text-gray-600">Party full name</span><input className={input} value={d.party_name} onChange={(e) => setD({ ...d, party_name: e.target.value })} /></label>
                <label className="block"><span className="text-xs font-semibold text-gray-600">Running mate</span><input className={input} value={d.running_mate} onChange={(e) => setD({ ...d, running_mate: e.target.value })} /></label>
              </div>
              <div className="flex items-center gap-3">
                {d.photo_url && <img src={d.photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />}
                <label className={`${btnSecondary} cursor-pointer`}><Upload className="w-4 h-4" /> {d.photo_url ? 'Replace photo' : 'Upload photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
                <span className="text-xs text-gray-500">Use an official campaign or press photo you have the right to use.</span>
              </div>
              <label className="block"><span className="text-xs font-semibold text-gray-600">Background (neutral, factual)</span>
                <textarea rows={5} className={input} value={d.bio} onChange={(e) => setD({ ...d, bio: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-semibold text-gray-600">Offices held (separate with ;)</span>
                <textarea rows={2} className={input} value={d.past_offices} onChange={(e) => setD({ ...d, past_offices: e.target.value })} /></label>

              <div>
                <p className="text-xs font-semibold text-gray-600">Campaign promises — each with a source</p>
                {d.promises.map((p, i) => (
                  <div key={i} className="grid md:grid-cols-[1fr_8rem_12rem_auto] gap-2 mt-2">
                    <input className={input} value={p.text} placeholder="Promise" onChange={(e) => setD({ ...d, promises: d.promises.map((q, j) => j === i ? { ...q, text: e.target.value } : q) })} />
                    <input className={input} type="date" value={p.date || ''} onChange={(e) => setD({ ...d, promises: d.promises.map((q, j) => j === i ? { ...q, date: e.target.value } : q) })} />
                    <input className={input} value={p.source_url || ''} placeholder="Source URL" onChange={(e) => setD({ ...d, promises: d.promises.map((q, j) => j === i ? { ...q, source_url: e.target.value } : q) })} />
                    <span className="flex items-center gap-1">
                      {p.source_url && <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-gray-500"><ExternalLink className="w-4 h-4" /></a>}
                      <button onClick={() => setD({ ...d, promises: d.promises.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </span>
                  </div>
                ))}
                <button onClick={() => setD({ ...d, promises: [...d.promises, { text: '', date: '', source_url: '' }] })} className="text-sm font-semibold text-red-600 mt-2 inline-flex items-center gap-1"><Plus className="w-4 h-4" /> Add promise</button>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600">Sources for this profile</p>
                {d.sources.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1 text-sm">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline truncate flex-1">{s.title}</a>
                    <button onClick={() => setD({ ...d, sources: d.sources.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <label className="block"><span className="text-xs font-semibold text-gray-600">Words that find them in headlines (comma separated)</span>
                <input className={input} value={d.search_terms} onChange={(e) => setD({ ...d, search_terms: e.target.value })} /></label>

              <div className="flex items-center gap-3">
                <button onClick={save} disabled={!!busy} className={btnPrimary}><Save className="w-4 h-4" /> Save</button>
                {busy && <span className="text-sm text-gray-600">{busy}</span>}
              </div>
            </div>
          ) : <div className={card}><p className="text-sm text-gray-600">Pick a candidate to edit their profile.</p></div>}
        </div>
      </div>

      <div className={card}>
        <h3 className="font-bold text-gray-900">Registered voters by state</h3>
        <p className="text-sm text-gray-600 mt-1">{stats.length} of 37 entered. Add states from INEC’s own publication — each needs a source.</p>
        <div className="grid md:grid-cols-5 gap-2 mt-3">
          <select className={input} value={newState.label} onChange={(e) => setNewState({ ...newState, label: e.target.value })}>
            <option value="">State</option>{STATES.filter((s) => !stats.some((x) => x.label === s)).map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className={input} placeholder="Registered voters" inputMode="numeric" value={newState.value} onChange={(e) => setNewState({ ...newState, value: e.target.value })} />
          <input className={input} type="date" value={newState.as_of} onChange={(e) => setNewState({ ...newState, as_of: e.target.value })} />
          <input className={input} placeholder="Source URL" value={newState.source_url} onChange={(e) => setNewState({ ...newState, source_url: e.target.value })} />
          <button onClick={addState} className={btnPrimary}><Plus className="w-4 h-4" /> Add</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {stats.map((s) => <span key={s.label} className="px-2 py-1 bg-gray-100 rounded">{s.label}: {fmtNum(s.value)}</span>)}
        </div>
      </div>
    </div>
  );
}
