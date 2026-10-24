// /election-2027/:slug — one candidate (presidential or governorship), same template for all.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Vote } from 'lucide-react';
import { Header } from '../components/Header';
import { ShareButtons } from '../components/ShareButtons';
import { supabase } from '../lib/supabase';
import { updateMetaTags } from '../utils/seo';
import { buildArticleUrl } from '../utils/articleUrl';
import { type Candidate, asPromises, asSources, initials, SITE, raceById } from '../utils/election';

export function ElectionCandidatePage() {
  const { slug } = useParams();
  const [c, setC] = useState<Candidate | null>(null);
  const [missing, setMissing] = useState(false);
  const [stories, setStories] = useState<{ id: string; title: string; slug: string | null; published_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('election_candidates').select('*').eq('slug', slug || '').maybeSingle();
      if (!data) { setMissing(true); return; }
      const cand = data as unknown as Candidate;
      setC(cand);
      updateMetaTags({
        title: raceById(cand.race).kind === 'president'
          ? `${cand.name} (${cand.party_abbr}) — 2027 Presidential Candidate Profile | CelebUD`
          : `${cand.name} (${cand.party_abbr}) — ${raceById(cand.race).state} Governorship Candidate 2027 | CelebUD`,
        description: `${cand.name} is the ${cand.party_name || cand.party_abbr} candidate for ${raceById(cand.race).kind === 'president' ? "Nigeria's 2027 presidential election" : `${raceById(cand.race).state} State governor in 2027`}${cand.running_mate ? `, with ${cand.running_mate} as ${raceById(cand.race).kind === 'president' ? 'running mate' : 'deputy'}` : ''}. Background, past offices, promises and coverage.`,
        type: 'website',
      });
      if (cand.search_terms.length) {
        const ors = cand.search_terms.map((t) => `title.ilike.%${t.replace(/[,()%]/g, ' ')}%`).join(',');
        const { data: a } = await supabase.from('media_content').select('id, title, slug, published_at')
          .eq('media_type', 'article').eq('is_published', true).or(ors).order('published_at', { ascending: false }).limit(8);
        setStories(a || []);
      }
    })();
  }, [slug]);

  const promises = c ? asPromises(c.promises) : [];
  const race = raceById(c?.race || 'president-2027');
  const isPres = race.kind === 'president';
  const sources = c ? asSources(c.sources) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 pb-16 max-w-3xl mx-auto px-4">
        <Link to={race.path} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-4 h-4 mr-1" /> {isPres ? 'All presidential candidates' : `All ${race.state} governorship candidates`}</Link>
        {missing && <p className="text-gray-700">Candidate not found. <Link to="/election-2027" className="text-red-600 underline">See all candidates</Link>.</p>}
        {c && (
          <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10">
            <div className="flex items-center gap-5">
              {c.photo_url
                ? <img src={c.photo_url} alt={c.name} className="w-20 h-20 rounded-full object-cover" />
                : <span className="w-20 h-20 rounded-full bg-gray-900 text-white flex items-center justify-center text-2xl font-bold">{initials(c.name)}</span>}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-600">{isPres ? '2027 presidential candidate' : `2027 ${race.state} governorship candidate`} · {isPres ? 'ballot' : 'INEC list'} no. {c.ballot_order}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{c.name}</h1>
                <p className="text-gray-600">{c.party_name ? `${c.party_name} (${c.party_abbr})` : c.party_abbr}</p>
              </div>
            </div>

            <dl className="grid sm:grid-cols-2 gap-4 mt-6 text-sm">
              <div className="bg-gray-50 rounded-xl p-4"><dt className="text-gray-500">{isPres ? 'Running mate' : 'Deputy governorship candidate'}</dt><dd className="font-semibold text-gray-900">{c.running_mate || '—'}</dd></div>
              <div className="bg-gray-50 rounded-xl p-4"><dt className="text-gray-500">Election day</dt><dd className="font-semibold text-gray-900">{isPres ? 'Saturday, 16 January 2027' : 'Saturday, 6 February 2027'}</dd></div>
            </dl>

            <h2 className="text-lg font-bold text-gray-900 mt-8">Background</h2>
            {c.bio ? <p className="text-gray-700 mt-2 leading-relaxed whitespace-pre-line">{c.bio}</p>
              : <p className="text-gray-500 mt-2">Our editors are preparing this profile, to the same standard for every candidate.</p>}

            {c.past_offices && (<>
              <h2 className="text-lg font-bold text-gray-900 mt-6">Offices held</h2>
              <ul className="list-disc pl-5 text-gray-700 mt-2">{c.past_offices.split(';').map((o) => o.trim()).filter(Boolean).map((o) => <li key={o}>{o}</li>)}</ul>
            </>)}

            <h2 className="text-lg font-bold text-gray-900 mt-6">What they have promised</h2>
            {promises.length ? (
              <ul className="space-y-3 mt-2">
                {promises.map((p, i) => (
                  <li key={i} className="border-l-4 border-red-600 pl-3 text-gray-800">
                    {p.text}
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {p.date && new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {p.source_url && <> {p.date ? '· ' : ''}<a href={p.source_url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">source <ExternalLink className="w-3 h-3" /></a></>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-500 mt-2">No campaign promises recorded yet. We add them, with a source for each, as the campaign goes on.</p>}

            <div className="mt-8 p-5 bg-gray-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 font-semibold flex items-center gap-2"><Vote className="w-5 h-5 text-red-400" /> Who would you vote for today?</p>
              <Link to={race.pollPath} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-center">Take the reader poll</Link>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-900 mb-2">Share this profile</p>
              <ShareButtons url={`${SITE}/election-2027/${c.slug}`} text={`${c.name} (${c.party_abbr}): background and campaign promises — ${isPres ? '2027 presidential' : `2027 ${race.state} governorship`} candidate profile on CelebUD`} title={`${c.name} — ${isPres ? '2027 presidential candidate' : `${race.state} governorship candidate`}`} />
            </div>

            {stories.length > 0 && (<>
              <h2 className="text-lg font-bold text-gray-900 mt-8">CelebUD coverage</h2>
              <ul className="mt-2 space-y-2">{stories.map((s) => <li key={s.id}><Link to={buildArticleUrl(s)} className="text-gray-800 hover:text-red-600 font-medium">{s.title}</Link></li>)}</ul>
            </>)}

            {sources.length > 0 && (<>
              <h2 className="text-sm font-bold text-gray-900 mt-8">Sources</h2>
              <ul className="mt-1 space-y-1 text-xs text-gray-600">{sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a></li>)}</ul>
            </>)}
            <p className="text-xs text-gray-500 mt-6">
              Every candidate’s page follows the same template. CelebUD does not endorse candidates. Last updated {new Date(c.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Spotted an error? <a href="mailto:info@celebud.com?subject=Election%202027%20correction" className="underline">Tell us</a>.
            </p>
          </article>
        )}
      </main>
    </div>
  );
}
