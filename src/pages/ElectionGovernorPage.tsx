// /election-2027/governor/:state — one governorship race: every candidate
// on INEC's final list (in INEC's order and spelling), the state's voter
// numbers, and the state's reader poll.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Vote, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { ShareButtons } from '../components/ShareButtons';
import { supabase } from '../lib/supabase';
import { updateMetaTags } from '../utils/seo';
import { type Candidate, type PollResults, type VoterStat, raceByState, raceShareMessage, daysUntil, fmtNum, initials, asSources, SITE } from '../utils/election';

export function ElectionGovernorPage() {
  const { state } = useParams();
  const race = raceByState(state);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<VoterStat | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);

  useEffect(() => {
    if (!race) return;
    updateMetaTags({
      title: `${race.state} Governorship Election 2027: All Candidates & Reader Poll | CelebUD`,
      description: `Every candidate for Governor of ${race.state} State on INEC's final list, with running mates, ${race.state}'s registered voters, and the CelebUD reader poll. Election day: 6 February 2027.`,
      type: 'website',
    });
    (async () => {
      const [c, v, r] = await Promise.all([
        supabase.from('election_candidates').select('*').eq('race', race.id).eq('is_active', true).order('ballot_order'),
        supabase.from('election_voter_stats').select('*').eq('kind', 'state').eq('label', race.state!).maybeSingle(),
        supabase.rpc('election_poll_results', { p_slug: race.id }),
      ]);
      setCands((c.data as unknown as Candidate[]) || []);
      setVoters((v.data as unknown as VoterStat) || null);
      setResults((r.data as unknown as PollResults) || null);
    })();
  }, [race?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!race) {
    return (
      <div className="min-h-screen bg-gray-50"><Header />
        <main className="pt-28 max-w-3xl mx-auto px-4"><p className="text-gray-700">We don’t cover that governorship race yet. <Link to="/election-2027" className="text-red-600 underline">See the races we cover</Link>.</p></main>
      </div>
    );
  }
  const source = asSources(cands[0]?.sources ?? [])[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 pb-16">
        <section className="bg-gray-900 text-white">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <Link to="/election-2027" className="inline-flex items-center text-sm text-gray-300 hover:text-white"><ArrowLeft className="w-4 h-4 mr-1" /> Nigeria Decides 2027</Link>
            <p className="text-sm font-bold uppercase tracking-widest text-red-400 mt-4 flex items-center gap-2"><Vote className="w-4 h-4" /> {race.state} governorship election</p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-2">Who should be the next Governor of {race.state} State?</h1>
            <div className="flex flex-wrap gap-3 mt-5">
              <div className="bg-white/10 rounded-xl px-5 py-3"><p className="text-3xl font-bold tabular-nums">{daysUntil(race.day)}</p><p className="text-xs text-gray-300">days to polling day · Saturday 6 Feb 2027</p></div>
              <div className="bg-white/10 rounded-xl px-5 py-3"><p className="text-3xl font-bold tabular-nums">{cands.length || '—'}</p><p className="text-xs text-gray-300">candidates on INEC’s final list</p></div>
              {voters && <div className="bg-white/10 rounded-xl px-5 py-3"><p className="text-3xl font-bold tabular-nums">{fmtNum(voters.value)}</p><p className="text-xs text-gray-300">registered voters (INEC)</p></div>}
              <Link to={race.pollPath} className="bg-red-600 hover:bg-red-700 rounded-xl px-5 py-3 flex items-center font-semibold">Take the {race.state} poll →</Link>
            </div>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-red-600" /> The candidates</h2>
            <p className="text-gray-600 mt-1">In INEC’s order. Names are spelled as they appear on INEC’s final list. CelebUD does not endorse any candidate.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {cands.map((c) => (
                <Link key={c.id} to={`/election-2027/${c.slug}`} className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition">
                  {c.photo_url
                    ? <img src={c.photo_url} alt={c.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    : <span className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0">{initials(c.name)}</span>}
                  <span className="min-w-0">
                    <span className="block font-bold text-gray-900 group-hover:text-red-600">{c.name}</span>
                    <span className="block text-sm text-gray-600">{c.party_abbr}{c.party_name ? ` · ${c.party_name}` : ''}</span>
                    {c.running_mate && <span className="block text-xs text-gray-500">Deputy: {c.running_mate}</span>}
                  </span>
                </Link>
              ))}
            </div>
            {source && <p className="text-xs text-gray-500 mt-3">Source: <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">{source.title}</a>.</p>}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900">If {race.state} voted today, who gets your vote?</h2>
            <p className="text-gray-600 mt-1">
              {results?.blackout ? 'The reader poll is paused for the legal 24-hour silence before polling day.' : `${fmtNum(results?.total ?? 0)} readers have voted so far.`}
            </p>
            <Link to={race.pollPath} className="inline-block mt-4 px-5 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">Vote & see results</Link>
            <p className="font-semibold text-gray-900 mt-6 mb-2">Share the {race.state} poll</p>
            <ShareButtons url={`${SITE}${race.pollPath}`} text={raceShareMessage(race)} title={`${race.state} governorship 2027 reader poll`} />
          </section>

          <p className="text-xs text-gray-500">
            Ekiti, Osun and Ondo elect their governors on separate off-cycle dates, so they are not part of the 6 February 2027 polls.
            Corrections: <a href="mailto:info@celebud.com?subject=Election%202027%20correction" className="underline">info@celebud.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
