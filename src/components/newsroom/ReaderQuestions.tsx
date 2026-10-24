import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, Copy, CheckCheck, Plus, EyeOff, Star, Lock, Unlock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { slugify } from '../../utils/articleUrl';
import { newsroomAI, createDraftArticle, editLink, timeAgo, btnPrimary, btnSecondary, input, card, type Draft } from './shared';

interface Question { id: string; slug: string; question: string; intro: string | null; is_open: boolean; created_at: string }
interface Answer { id: string; name: string | null; location: string | null; answer: string; contact: string | null; may_quote: boolean; status: string; created_at: string }

/**
 * Reader callouts: ask the audience one question, share the link on
 * WhatsApp and Facebook, and turn what comes back into a story with real
 * numbers and real quotes nobody else has.
 */
export function ReaderQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newQ, setNewQ] = useState('');
  const [newIntro, setNewIntro] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [story, setStory] = useState<{ themes: { theme: string; count: number }[]; total: number; draft: Draft } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('reader_questions').select('*').order('created_at', { ascending: false });
    const qs = (data as Question[]) || [];
    setQuestions(qs);
    const c: Record<string, number> = {};
    await Promise.all(qs.map(async (q) => {
      const { count } = await supabase.from('reader_answers').select('id', { count: 'exact', head: true }).eq('question_id', q.id);
      c[q.id] = count ?? 0;
    }));
    setCounts(c);
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = async (q: Question) => {
    setSelected(q); setStory(null); setSavedId(null); setError(null);
    const { data } = await supabase.from('reader_answers').select('*').eq('question_id', q.id).order('created_at', { ascending: false });
    setAnswers((data as Answer[]) || []);
  };

  const create = async () => {
    setError(null);
    const base = slugify(newQ).slice(0, 60) || 'question';
    const { data, error: e } = await supabase.from('reader_questions')
      .insert({ question: newQ.trim(), intro: newIntro.trim() || null, slug: `${base}-${Math.random().toString(36).slice(2, 6)}` })
      .select('*').single();
    if (e) { setError(e.message); return; }
    setNewQ(''); setNewIntro('');
    await load();
    open(data as Question);
  };

  const shareUrl = (q: Question) => `https://celebud.com/ask/${q.slug}`;
  const shareText = (q: Question) => `${q.question}\n\nTell CelebUD in 1 minute — your answer may appear in our next story:\n${shareUrl(q)}`;

  const setStatus = async (a: Answer, status: string) => {
    await supabase.from('reader_answers').update({ status }).eq('id', a.id);
    setAnswers((as) => as.map((x) => (x.id === a.id ? { ...x, status } : x)));
  };

  const toggleOpen = async (q: Question) => {
    await supabase.from('reader_questions').update({ is_open: !q.is_open }).eq('id', q.id);
    const nq = { ...q, is_open: !q.is_open };
    setSelected(nq); setQuestions((qs) => qs.map((x) => (x.id === q.id ? nq : x)));
  };

  const build = async () => {
    if (!selected) return;
    setBusy('Reading every answer…'); setError(null); setStory(null);
    try {
      setStory(await newsroomAI('group_answers', { question_id: selected.id }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
  };

  const save = async () => {
    if (!story) return;
    setBusy('Saving…');
    try { setSavedId(await createDraftArticle(story.draft, { categorySlug: 'society' })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MessageSquareText className="w-5 h-5 text-red-600" /> Ask your readers</h2>
        <p className="text-sm text-gray-600 mt-1">
          Ask one clear question, share the link to your WhatsApp channel and Facebook page, and turn the answers into a story with real numbers and quotes.
          Good questions are specific: <em>“What did it cost you to send ₦100,000 home this month, and which service did you use?”</em>
        </p>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <input className={input} value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Your question (10–300 characters)" maxLength={300} />
          <input className={input} value={newIntro} onChange={(e) => setNewIntro(e.target.value)} placeholder="Optional: one line of context shown above the question" maxLength={1000} />
        </div>
        <button onClick={create} disabled={newQ.trim().length < 10} className={`${btnPrimary} mt-3`}><Plus className="w-4 h-4" /> Create question</button>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {questions.map((q) => (
            <button key={q.id} onClick={() => open(q)}
              className={`w-full text-left p-3 rounded-lg border ${selected?.id === q.id ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <p className="text-sm font-semibold text-gray-900">{q.question}</p>
              <p className="text-xs text-gray-500 mt-1">{counts[q.id] ?? 0} answers · {q.is_open ? 'open' : 'closed'} · {timeAgo(q.created_at)}</p>
            </button>
          ))}
          {questions.length === 0 && <p className="text-sm text-gray-500">No questions yet.</p>}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <div className={card}>
              <p className="font-semibold text-gray-900">{selected.question}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className={btnSecondary} onClick={() => { navigator.clipboard.writeText(shareText(selected)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy share message'}
                </button>
                <a className={btnSecondary} href={`https://wa.me/?text=${encodeURIComponent(shareText(selected))}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
                <a className={btnSecondary} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl(selected))}`} target="_blank" rel="noopener noreferrer">Share on Facebook</a>
                <button className={btnSecondary} onClick={() => toggleOpen(selected)}>
                  {selected.is_open ? <><Lock className="w-4 h-4" /> Close answers</> : <><Unlock className="w-4 h-4" /> Reopen</>}
                </button>
                <button className={btnPrimary} onClick={build} disabled={!!busy || answers.filter((a) => a.status !== 'hidden').length < 3}>Find themes & draft a story</button>
              </div>
              {busy && <p className="text-sm text-gray-600 mt-2">{busy}</p>}
            </div>
          )}

          {story && (
            <div className={card}>
              <p className="text-xs font-bold uppercase text-gray-500">What {story.total} readers said</p>
              <ul className="mt-2 space-y-1">{story.themes.map((t) => <li key={t.theme} className="text-sm"><strong>{t.count}</strong> — {t.theme}</li>)}</ul>
              <h3 className="font-bold text-gray-900 mt-4">{story.draft.title}</h3>
              <div className="article-rich-content text-sm bg-gray-50 rounded-lg p-3 mt-2 max-h-96 overflow-auto" dangerouslySetInnerHTML={{ __html: story.draft.content }} />
              <div className="mt-3">
                {savedId
                  ? <Link className={btnPrimary} to={editLink(savedId)}>Open the draft to review and publish</Link>
                  : <button className={btnPrimary} onClick={save} disabled={!!busy}>Save as hidden draft</button>}
              </div>
              <p className="text-xs text-gray-500 mt-2">Only readers who ticked “you may quote me” are quoted by name. Check every quote against the answers below before publishing.</p>
            </div>
          )}

          {selected && answers.map((a) => (
            <div key={a.id} className={`${card} ${a.status === 'hidden' ? 'opacity-50' : ''}`}>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.answer}</p>
              <p className="text-xs text-gray-500 mt-2">
                {a.name || 'Anonymous'}{a.location ? `, ${a.location}` : ''} · {timeAgo(a.created_at)} · {a.may_quote ? 'may be quoted' : 'not for quoting'}
                {a.contact && <> · contact: {a.contact}</>}
              </p>
              <div className="flex gap-2 mt-2">
                <button className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1" onClick={() => setStatus(a, a.status === 'useful' ? 'new' : 'useful')}>
                  <Star className="w-3 h-3" /> {a.status === 'useful' ? 'Marked useful' : 'Mark useful'}
                </button>
                <button className="text-xs font-semibold text-gray-500 inline-flex items-center gap-1" onClick={() => setStatus(a, a.status === 'hidden' ? 'new' : 'hidden')}>
                  <EyeOff className="w-3 h-3" /> {a.status === 'hidden' ? 'Unhide' : 'Hide (spam / off-topic)'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
