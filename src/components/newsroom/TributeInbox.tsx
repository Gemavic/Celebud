import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Copy, CheckCheck, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { newsroomAI, createDraftArticle, editLink, timeAgo, btnPrimary, btnSecondary, card, type Draft } from './shared';

interface Submission {
  id: string; submitter_name: string; submitter_contact: string; relationship: string | null;
  honoree_name: string; occasion: string; occasion_date: string | null; story: string; quotes: string | null;
  photos: string[]; status: string; article_id: string | null; created_at: string;
}

const STATUS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800', in_progress: 'bg-amber-100 text-amber-800',
  drafted: 'bg-green-100 text-green-800', declined: 'bg-gray-100 text-gray-500',
};

/** Families send their story at /tributes/submit; it lands here for an editor. */
export function TributeInbox() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [open, setOpen] = useState<Submission | null>(null);
  const [draft, setDraft] = useState<{ draft: Draft; thumbnail: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('tribute_submissions').select('*').order('created_at', { ascending: false }).limit(100);
    setRows((data as Submission[]) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (s: Submission, status: string, article_id?: string) => {
    await supabase.from('tribute_submissions').update({ status, ...(article_id ? { article_id } : {}) }).eq('id', s.id);
    const ns = { ...s, status, article_id: article_id ?? s.article_id };
    setRows((r) => r.map((x) => (x.id === s.id ? ns : x)));
    if (open?.id === s.id) setOpen(ns);
  };

  const write = async (s: Submission) => {
    setBusy('Writing the tribute from the family\'s words…'); setError(null); setDraft(null);
    try {
      setDraft(await newsroomAI('tribute_draft', { submission_id: s.id }));
      if (s.status === 'new') await setStatus(s, 'in_progress');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(null); }
  };

  const save = async (s: Submission) => {
    if (!draft) return;
    setBusy('Saving…');
    try {
      const id = await createDraftArticle(draft.draft, { categorySlug: 'celebrity', thumbnailUrl: draft.thumbnail });
      await setStatus(s, 'drafted', id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(null); }
  };

  const link = 'https://celebud.com/tributes/submit';
  const msg = `Celebrating someone special? Send CelebUD their story and photos and we'll write a tribute for them:\n${link}`;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Heart className="w-5 h-5 text-red-600" /> Tribute submissions</h2>
        <p className="text-sm text-gray-600 mt-1">Families send birthdays, memorials, anniversaries and achievements through a simple form. You write it up from their words and photos.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button className={btnSecondary} onClick={() => { navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy invitation message'}
          </button>
          <a className={btnSecondary} href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
          <a className={btnSecondary} href="/tributes/submit" target="_blank" rel="noopener noreferrer">See the form</a>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {rows.map((s) => (
            <button key={s.id} onClick={() => { setOpen(s); setDraft(null); setError(null); }}
              className={`w-full text-left p-3 rounded-lg border ${open?.id === s.id ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{s.honoree_name}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS[s.status]}`}>{s.status.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{s.occasion} · from {s.submitter_name} · {timeAgo(s.created_at)}</p>
            </button>
          ))}
          {rows.length === 0 && <p className="text-sm text-gray-500">No submissions yet. Share the invitation with your WhatsApp channel.</p>}
        </div>

        {open && (
          <div className="lg:col-span-2 space-y-4">
            <div className={card}>
              <h3 className="font-bold text-gray-900">{open.honoree_name} — {open.occasion}{open.occasion_date ? `, ${open.occasion_date}` : ''}</h3>
              <p className="text-xs text-gray-500 mt-1">From {open.submitter_name}{open.relationship ? ` (${open.relationship})` : ''} · contact: {open.submitter_contact}</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap mt-3">{open.story}</p>
              {open.quotes && <><p className="text-xs font-bold uppercase text-gray-500 mt-3">Words from family and friends</p><p className="text-sm text-gray-800 whitespace-pre-wrap">{open.quotes}</p></>}
              {open.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {open.photos.map((p) => <a key={p} href={p} target="_blank" rel="noopener noreferrer"><img src={p} alt="" className="w-24 h-24 object-cover rounded-lg border" /></a>)}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                {open.article_id
                  ? <Link className={btnPrimary} to={editLink(open.article_id)}>Open the tribute draft</Link>
                  : <button className={btnPrimary} onClick={() => write(open)} disabled={!!busy}>Write tribute draft</button>}
                {open.status !== 'declined' && !open.article_id && (
                  <button className={btnSecondary} onClick={() => setStatus(open, 'declined')}><X className="w-4 h-4" /> Decline</button>
                )}
              </div>
              {busy && <p className="text-sm text-gray-600 mt-2">{busy}</p>}
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>

            {draft && !open.article_id && (
              <div className={card}>
                <h3 className="font-bold text-gray-900">{draft.draft.title}</h3>
                <div className="article-rich-content text-sm bg-gray-50 rounded-lg p-3 mt-2 max-h-96 overflow-auto" dangerouslySetInnerHTML={{ __html: draft.draft.content }} />
                <button className={`${btnPrimary} mt-3`} onClick={() => save(open)} disabled={!!busy}>Save as hidden draft</button>
                <p className="text-xs text-gray-500 mt-2">The first photo becomes the thumbnail. Read it through and check names and dates with the family before you publish.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
