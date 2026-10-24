// /election-2027 — "Nigeria Decides 2027": where the votes are, every
// presidential candidate on equal terms, and the reader poll.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Vote, Users, MapPin, CalendarDays, ArrowRight } from 'lucide-react';
import { ShareButtons } from '../components/ShareButtons';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { updateMetaTags } from '../utils/seo';
import { buildArticleUrl } from '../utils/articleUrl';
import {
  type Candidate, type VoterStat, type PollResults, POLL_SLUG, PRESIDENTIAL_DAY, GOVERNORSHIP_DAY,
  daysUntil, fmtNum, pct, initials, POLL_SHARE_MESSAGE, SITE,
} from '../utils/election';

function Bar({ label, value, total, note }: { label: string; value: number; total: number; note?: string }) {
  const w = total > 0 ? Math.max(2, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-medium text-gray-800">{label}</span><span className="text-gray-600 tabular-nums">{fmtNum(value)} · {pct(value, total)}</span></div>
      <div className="h-2.5 bg-gray-100 rounded-full mt-1"><div className="h-2.5 bg-red-600 rounded-full" style={{ width: `${w}%` }} /></div>
      {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  );
}

export function ElectionHubPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<VoterStat[]>([]);
  const [results, setResults] = useState<PollResults | null>(null);
  const [stories, setStories] = useState<{ id: string; title: string; slug: string | null; published_at: string }[]>([]);

  useEffect(() => {
    updateMetaTags({
      title: 'Nigeria Decides 2027: Candidates, Voter Numbers & Reader Poll | CelebUD',
      description: 'All 18 presidential candidates, where Nigeria’s 103.4 million registered voters are by zone, state and age, and the CelebUD reader poll.',
      type: 'website',
    });
    (async () => {
      const [c, s, r, a] = await Promise.all([
        supabase.from('election_candidates').select('*').eq('race', 'president-2027').eq('is_active', true).order('ballot_order'),
        supabase.from('election_voter_stats').select('*').order('sort'),
        supabase.rpc('election_poll_results', { p_slug: POLL_SLUG }),
        supabase.from('media_content').select('id, title, slug, published_at').eq('media_type', 'article').eq('is_published', true)
          .or('title.ilike.%2027%,title.ilike.%INEC%,title.ilike.%election%').order('published_at', { ascending: false }).limit(6),
      ]);
      setCandidates((c.data as unknown as Candidate[]) || []);
      setStats((s.data as unknown as VoterStat[]) || []);
      setResults((r.data as unknown as PollResults) || null);
      setStories(a.data || []);
    })();
  }, []);

  const by = (k: VoterStat['kind']) => stats.filter((s) => s.kind === k).sort((a, b) => a.sort - b.sort);
  const total = by('total')[0]?.value ?? 0;
  const zones = by('zone');
  const ages = by('age');
  const genders = by('gender');
  const states = useMemo(() => by('state').sort((a, b) => b.value - a.value), [stats]); // eslint-disable-line react-hooks/exhaustive-deps
  const source = by('total')[0];
  const under50 = ages.filter((a) => a.label === '18-34' || a.label === '35-49').reduce((n, a) => n + a.value, 0);
  const north = zones.filter((z) => z.label.startsWith('North')).reduce((n, z) => n + z.value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 pb-16">
        {/* Hero */}
        <section className="bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
            <p className="text-sm font-bold uppercase tracking-widest text-red-400 flex items-center gap-2"><Vote className="w-4 h-4" /> Nigeria Decides 2027</p>
            <h1 className="text-3xl sm:text-5xl font-bold mt-3 leading-tight">18 candidates. 103.4 million voters. One question.</h1>
            <p className="text-gray-300 mt-3 max-w-2xl">Who the candidates are, where the votes are, and who our readers would vote for today — every candidate on the same terms.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="bg-white/10 rounded-xl px-5 py-3"><p className="text-3xl font-bold tabular-nums">{daysUntil(PRESIDENTIAL_DAY)}</p><p className="text-xs text-gray-300">days to the presidential vote · 16 Jan 2027</p></div>
              <div className="bg-white/10 rounded-xl px-5 py-3"><p className="text-3xl font-bold tabular-nums">{daysUntil(GOVERNORSHIP_DAY)}</p><p className="text-xs text-gray-300">days to governorship polls · 6 Feb 2027</p></div>
              <Link to="/election-2027/poll" className="bg-red-600 hover:bg-red-700 rounded-xl px-5 py-3 flex items-center gap-2 font-semibold">
                Take the reader poll <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 space-y-10 mt-10">
          {/* Where the votes are */}
          {total > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-6 h-6 text-red-600" /> Where the votes are</h2>
              <p className="text-gray-600 mt-1">INEC’s 2027 register: <strong>{fmtNum(total)}</strong> registered voters. The North holds {pct(north, total)} of them; voters under 50 are {pct(under50, total)}.</p>
              <div className="grid lg:grid-cols-3 gap-5 mt-5">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <h3 className="font-bold text-gray-900">By geopolitical zone</h3>
                  {zones.sort((a, b) => b.value - a.value).map((z) => <Bar key={z.label} label={z.label} value={z.value} total={total} />)}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <h3 className="font-bold text-gray-900">By age</h3>
                  {ages.map((a) => <Bar key={a.label} label={a.label} value={a.value} total={total} />)}
                  <h3 className="font-bold text-gray-900 pt-2">By gender</h3>
                  {genders.map((g) => <Bar key={g.label} label={g.label} value={g.value} total={total} />)}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900">Biggest states</h3>
                  <table className="w-full text-sm mt-2">
                    <tbody>
                      {states.map((s, i) => (
                        <tr key={s.label} className="border-b last:border-0">
                          <td className="py-1.5 pr-2 text-gray-500 w-6">{i + 1}</td>
                          <td className="py-1.5 pr-2 font-medium text-gray-800">{s.label}<span className="block text-xs text-gray-500">{s.zone}</span></td>
                          <td className="py-1.5 text-right tabular-nums">{fmtNum(s.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-2">States shown are those INEC’s figures have been reported for consistently. More will be added as INEC publishes the full breakdown.</p>
                </div>
              </div>
              {source?.source_url && (
                <p className="text-xs text-gray-500 mt-3">Source: INEC, as reported {new Date(source.as_of).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="underline">{source.source_title}</a>.</p>
              )}
            </section>
          )}

          {/* Candidates */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6 text-red-600" /> The presidential candidates</h2>
            <p className="text-gray-600 mt-1">All 18, in INEC’s ballot order. CelebUD does not endorse any candidate.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {candidates.map((c) => (
                <Link key={c.id} to={`/election-2027/${c.slug}`} className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition">
                  {c.photo_url
                    ? <img src={c.photo_url} alt={c.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                    : <span className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0">{initials(c.name)}</span>}
                  <span className="min-w-0">
                    <span className="block font-bold text-gray-900 group-hover:text-red-600">{c.name}</span>
                    <span className="block text-sm text-gray-600">{c.party_abbr}{c.party_name ? ` · ${c.party_name}` : ''}</span>
                    {c.running_mate && <span className="block text-xs text-gray-500">Running mate: {c.running_mate}</span>}
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">Source: INEC final list of presidential candidates, published September 2026.</p>
          </section>

          {/* Poll CTA */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">If the election were today, who gets your vote?</h2>
              <p className="text-gray-600 mt-1">
                {results?.blackout
                  ? 'The reader poll is paused for the legal 24-hour silence before polling day.'
                  : `${fmtNum(results?.total ?? 0)} readers have voted. See how each zone and age group is leaning.`}
              </p>
            </div>
            <Link to="/election-2027/poll" className="px-5 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 text-center">Vote & see results</Link>
          </section>
          <section className="-mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="font-semibold text-gray-900 mb-3">Share the poll</p>
            <ShareButtons url={`${SITE}/election-2027/poll`} text={POLL_SHARE_MESSAGE} title="CelebUD 2027 reader poll" />
          </section>

          {/* Stories */}
          {stories.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><CalendarDays className="w-6 h-6 text-red-600" /> Latest election coverage</h2>
              <ul className="grid md:grid-cols-2 gap-3 mt-4">
                {stories.map((s) => (
                  <li key={s.id}><Link to={buildArticleUrl(s)} className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm font-medium text-gray-900 hover:text-red-600">{s.title}</Link></li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-gray-500">
            The CelebUD reader poll counts votes from readers who choose to take part; it is not a scientific survey and does not predict the result.
            Corrections to any candidate information: <a href={`mailto:info@celebud.com?subject=Election%202027%20correction`} className="underline">info@celebud.com</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
