// /ask/:slug — a reader callout. One question, a one-minute answer form.
// Answers are write-only for visitors (nobody can read anyone else's) and
// reach the editor in the Newsroom; nothing is published automatically.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageSquareText, CheckCircle, ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { updateMetaTags } from '../utils/seo';

interface Question { id: string; question: string; intro: string | null; is_open: boolean }

const field = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent';

export function AskPage() {
  const { slug } = useParams();
  const [q, setQ] = useState<Question | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'ready' | 'sending' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ answer: '', name: '', location: '', contact: '', may_quote: false, website: '' });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('reader_questions').select('id, question, intro, is_open').eq('slug', slug || '').maybeSingle();
      if (!data) { setState('missing'); return; }
      setQ(data as Question);
      setState('ready');
      updateMetaTags({ title: `${data.question} | Ask CelebUD`, description: 'Tell CelebUD in a minute — your answer may appear in our next story.', type: 'website' });
    })();
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q) return;
    if (form.website) { setState('done'); return; } // honeypot: bots fill every field
    setError(null);
    setState('sending');
    // No .select() after insert: visitors may write an answer but never read one back.
    const { error: err } = await supabase.from('reader_answers').insert({
      question_id: q.id,
      answer: form.answer.trim(),
      name: form.name.trim() || null,
      location: form.location.trim() || null,
      contact: form.contact.trim() || null,
      may_quote: form.may_quote,
    });
    if (err) { setError(err.message.includes('Too many') ? err.message : 'Sorry, that did not send. Please try again.'); setState('ready'); return; }
    setState('done');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16 max-w-2xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-4 h-4 mr-1" /> CelebUD home</Link>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
          {state === 'loading' && <p className="text-gray-500">Loading…</p>}
          {state === 'missing' && <p className="text-gray-700">This question isn't available. <Link to="/" className="text-red-600 underline">Read today's stories</Link>.</p>}
          {q && state !== 'missing' && (
            <>
              <p className="text-sm font-bold uppercase tracking-wide text-red-600 flex items-center gap-2"><MessageSquareText className="w-4 h-4" /> Ask CelebUD</p>
              {q.intro && <p className="text-gray-600 mt-3">{q.intro}</p>}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3">{q.question}</h1>

              {state === 'done' ? (
                <div className="mt-8 p-5 bg-green-50 border border-green-200 rounded-xl">
                  <p className="font-semibold text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Thank you — your answer reached our editors.</p>
                  <p className="text-sm text-green-800 mt-1">Look out for the story on CelebUD and our WhatsApp channel.</p>
                </div>
              ) : !q.is_open ? (
                <p className="mt-6 text-gray-700">Answers to this question have closed. Thank you to everyone who replied.</p>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-gray-700">Your answer *</span>
                    <textarea required minLength={2} maxLength={3000} rows={5} className={field} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Tell us in your own words" />
                  </label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="block"><span className="text-sm font-semibold text-gray-700">First name</span>
                      <input maxLength={80} className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                    <label className="block"><span className="text-sm font-semibold text-gray-700">Where you live</span>
                      <input maxLength={80} className={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Ibadan, or Calgary" /></label>
                  </div>
                  <label className="block"><span className="text-sm font-semibold text-gray-700">Phone or email (optional — only if we may follow up)</span>
                    <input maxLength={120} className={field} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></label>
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                  <label className="flex items-start gap-3 text-sm text-gray-700">
                    <input type="checkbox" className="mt-1" checked={form.may_quote} onChange={(e) => setForm({ ...form, may_quote: e.target.checked })} />
                    <span>CelebUD may quote my answer with my first name and city. (Leave unticked and we'll only use it anonymously, as part of the overall count.)</span>
                  </label>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button type="submit" disabled={state === 'sending'} className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                    {state === 'sending' ? 'Sending…' : 'Send my answer'}
                  </button>
                  <p className="text-xs text-gray-500">We never publish your phone number or email. See our <Link to="/privacy" className="underline">privacy policy</Link>.</p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
