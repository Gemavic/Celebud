// /election-2027/poll — the shareable reader poll.
// One vote per device (enforced by the election-vote function). Candidates
// are shown in a random order for each visitor so ballot position can't
// favour anyone. Results are aggregates only and are always labelled as a
// self-selected reader poll, not a scientific survey or a prediction.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Vote, Info } from 'lucide-react';
import { ShareButtons } from '../components/ShareButtons';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { updateMetaTags } from '../utils/seo';
import {
  type Candidate, type PollResults, POLL_SLUG, STATES, STATE_ZONE, ZONES, AGE_BANDS,
  getDeviceId, hasVoted, markVoted, fmtNum, pct, POLL_SHARE_MESSAGE, SITE,
} from '../utils/election';

const MIN_FOR_BREAKDOWN = 30; // a zone or age group needs this many votes before its leader is shown

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

export function ElectionPollPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [order, setOrder] = useState<Candidate[]>([]);
  const [results, setResults] = useState<PollResults | null>(null);
  const [voted, setVoted] = useState(hasVoted(POLL_SLUG));
  const [choice, setChoice] = useState<string>('');
  const [form, setForm] = useState({ age_band: '', state: '', gender: '', registered: '', website: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateMetaTags({
      title: 'Who gets your vote in 2027? CelebUD Reader Poll',
      description: 'If Nigeria voted today, who would you choose for President? Vote in the CelebUD reader poll and see how each zone and age group is leaning.',
      type: 'website',
    });
    (async () => {
      const [c, r] = await Promise.all([
        supabase.from('election_candidates').select('*').eq('race', 'president-2027').eq('is_active', true).order('ballot_order'),
        supabase.rpc('election_poll_results', { p_slug: POLL_SLUG }),
      ]);
      const list = (c.data as unknown as Candidate[]) || [];
      setCandidates(list);
      setOrder(shuffle(list));
      setResults((r.data as unknown as PollResults) || null);
    })();
  }, []);

  const name = (id: string | null, undecided: boolean) =>
    undecided ? 'Undecided' : candidates.find((c) => c.id === id)?.name || 'Unknown';
  const party = (id: string | null) => candidates.find((c) => c.id === id)?.party_abbr || '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choice) { setError('Please choose a candidate, or “Undecided”.'); return; }
    setSending(true); setError(null);
    const { data, error: err } = await supabase.functions.invoke('election-vote', {
      body: {
        poll_slug: POLL_SLUG,
        device_id: getDeviceId(),
        candidate_id: choice === 'undecided' ? null : choice,
        undecided: choice === 'undecided',
        age_band: form.age_band || null,
        state: form.state === 'Outside Nigeria' ? 'Outside Nigeria' : form.state || null,
        zone: form.state === 'Outside Nigeria' ? 'Diaspora' : STATE_ZONE[form.state] || null,
        gender: form.gender || null,
        registered: form.registered || null,
        website: form.website,
      },
    });
    setSending(false);
    if (err) {
      let msg = 'Your vote could not be recorded. Please try again.';
      try { const body = await (err as { context?: Response }).context?.json(); if (body?.error) msg = body.error; } catch { /* keep default */ }
      if (msg === 'already_voted') {
        markVoted(POLL_SLUG); setVoted(true);
        const { data: r } = await supabase.rpc('election_poll_results', { p_slug: POLL_SLUG });
        setResults(r as unknown as PollResults);
        return;
      }
      setError(msg);
      return;
    }
    markVoted(POLL_SLUG);
    setVoted(true);
    if (data?.results) setResults(data.results as PollResults);
  };

  const total = results?.total ?? 0;
  const ranked = useMemo(() => [...(results?.by_candidate || [])].sort((a, b) => b.votes - a.votes), [results]);

  const leaders = (rows: { candidate_id: string | null; undecided: boolean; votes: number }[]) => {
    const n = rows.reduce((s, r) => s + r.votes, 0);
    const top = [...rows].sort((a, b) => b.votes - a.votes)[0];
    return { n, top };
  };
  const zoneRows = [...ZONES, 'Diaspora'].map((z) => ({ z, ...leaders((results?.by_zone || []).filter((r) => r.zone === z)) }));
  const ageRows = AGE_BANDS.map((a) => ({ a, ...leaders((results?.by_age || []).filter((r) => r.age_band === a)) }));

  const shareUrl = `${SITE}/election-2027/poll`;
  const select = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent';
  const showForm = !voted && results && !results.blackout && results.is_open !== false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 pb-16 max-w-3xl mx-auto px-4">
        <Link to="/election-2027" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-4 h-4 mr-1" /> Nigeria Decides 2027</Link>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wide text-red-600 flex items-center gap-2"><Vote className="w-4 h-4" /> CelebUD reader poll</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">If the 2027 presidential election were held today, who would you vote for?</h1>

          {results?.blackout && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
              The poll and its results are paused from midnight before polling day until polling day ends, as the Electoral Act requires. Thank you for taking part.
            </div>
          )}

          {showForm && (
            <form onSubmit={submit} className="mt-6 space-y-5">
              <fieldset>
                <legend className="text-sm font-semibold text-gray-700 mb-2">Choose one</legend>
                <div className="grid sm:grid-cols-2 gap-2">
                  {order.map((c) => (
                    <label key={c.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${choice === c.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name="choice" value={c.id} checked={choice === c.id} onChange={() => setChoice(c.id)} />
                      <span><span className="block font-semibold text-gray-900 text-sm">{c.name}</span><span className="block text-xs text-gray-500">{c.party_abbr}</span></span>
                    </label>
                  ))}
                  <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer ${choice === 'undecided' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="choice" value="undecided" checked={choice === 'undecided'} onChange={() => setChoice('undecided')} />
                    <span className="font-semibold text-gray-900 text-sm">Undecided</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">Candidates appear in a random order for each reader.</p>
              </fieldset>

              <div>
                <p className="text-sm font-semibold text-gray-700">About you <span className="font-normal text-gray-500">(optional — helps show how each zone and age group is leaning)</span></p>
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  <select className={select} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                    <option value="">State you vote in</option>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value="Outside Nigeria">I live outside Nigeria</option>
                  </select>
                  <select className={select} value={form.age_band} onChange={(e) => setForm({ ...form, age_band: e.target.value })}>
                    <option value="">Age group</option>{AGE_BANDS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select className={select} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">Gender</option><option value="female">Female</option><option value="male">Male</option>
                  </select>
                  <select className={select} value={form.registered} onChange={(e) => setForm({ ...form, registered: e.target.value })}>
                    <option value="">Do you have your PVC?</option><option value="yes">Yes</option><option value="no">No</option><option value="unsure">Not sure</option>
                  </select>
                </div>
              </div>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sending} className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                {sending ? 'Recording…' : 'Cast my vote & see results'}
              </button>
              <p className="text-xs text-gray-500">One vote per device. We don’t ask for your name or number, and we never store your IP address.</p>
            </form>
          )}

          {(voted || (results && results.is_open === false)) && results && !results.blackout && (
            <div className="mt-6">
              {voted && <p className="text-green-700 font-semibold">Thank you — your vote is counted.</p>}
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span><strong>{fmtNum(total)}</strong> readers have voted. This is a reader poll: it counts people who chose to take part, so it is not a scientific survey and does not predict the election.</span>
              </div>
              <div className="space-y-3 mt-4">
                {ranked.map((r) => (
                  <div key={(r.candidate_id || 'u') + r.undecided}>
                    <div className="flex justify-between text-sm"><span className="font-semibold text-gray-900">{name(r.candidate_id, r.undecided)} <span className="text-gray-500 font-normal">{party(r.candidate_id)}</span></span><span className="tabular-nums text-gray-700">{pct(r.votes, total)} · {fmtNum(r.votes)}</span></div>
                    <div className="h-3 bg-gray-100 rounded-full mt-1"><div className="h-3 bg-gray-800 rounded-full" style={{ width: `${total ? (r.votes / total) * 100 : 0}%` }} /></div>
                  </div>
                ))}
                {ranked.length === 0 && <p className="text-sm text-gray-500">No votes yet — be the first, and share the poll.</p>}
              </div>

              <h2 className="font-bold text-gray-900 mt-8">Leading choice by zone</h2>
              <table className="w-full text-sm mt-2">
                <tbody>{zoneRows.map(({ z, n, top }) => (
                  <tr key={z} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-gray-800">{z === 'Diaspora' ? 'Outside Nigeria' : z}</td>
                    <td className="py-2 pr-3 text-gray-700">{n >= MIN_FOR_BREAKDOWN && top ? `${name(top.candidate_id, top.undecided)} (${pct(top.votes, n, 0)})` : <span className="text-gray-400">Not enough votes yet</span>}</td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{fmtNum(n)} votes</td>
                  </tr>))}
                </tbody>
              </table>

              <h2 className="font-bold text-gray-900 mt-6">Leading choice by age</h2>
              <table className="w-full text-sm mt-2">
                <tbody>{ageRows.map(({ a, n, top }) => (
                  <tr key={a} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium text-gray-800">{a}</td>
                    <td className="py-2 pr-3 text-gray-700">{n >= MIN_FOR_BREAKDOWN && top ? `${name(top.candidate_id, top.undecided)} (${pct(top.votes, n, 0)})` : <span className="text-gray-400">Not enough votes yet</span>}</td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{fmtNum(n)} votes</td>
                  </tr>))}
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">A zone or age group appears once it has {MIN_FOR_BREAKDOWN} votes, so a handful of answers can’t speak for millions.</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="font-semibold text-gray-900">Share the poll — the more people vote, the more it means</p>
            <ShareButtons className="mt-3" url={shareUrl} text={POLL_SHARE_MESSAGE} title="CelebUD 2027 reader poll" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">See <Link to="/election-2027" className="underline">all 18 candidates and where Nigeria’s votes are</Link>. CelebUD does not endorse any candidate.</p>
      </main>
    </div>
  );
}
