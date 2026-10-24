import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { newsroomAI, createDraftArticle, editLink, btnPrimary, input, card, type Draft } from './shared';

const MAX_MB = 19;

/**
 * Voice note -> interview. Someone the editor knows answers a few questions
 * on WhatsApp; the recording is transcribed and shaped into a Q&A in their
 * own words. The person is real, so the article is original.
 */
export function VoiceNotes() {
  const [file, setFile] = useState<File | null>(null);
  const [interviewee, setInterviewee] = useState('');
  const [role, setRole] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('lifestyle');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ transcript: string; draft: Draft } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const run = async () => {
    if (!file || !interviewee.trim()) return;
    if (file.size > MAX_MB * 1024 * 1024) { setError(`That file is over ${MAX_MB} MB. Ask for a shorter voice note, or split it.`); return; }
    setError(null); setResult(null); setSavedId(null);
    try {
      setBusy('Uploading the voice note…');
      const ext = (file.name.split('.').pop() || 'ogg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      // WhatsApp .opus files often arrive with no type at all; name it from
      // the extension so the storage bucket accepts it.
      const byExt: Record<string, string> = {
        opus: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4',
        aac: 'audio/aac', wav: 'audio/wav', webm: 'audio/webm', amr: 'audio/amr',
      };
      const contentType = (file.type && file.type !== 'application/octet-stream' ? file.type.split(';')[0] : '') || byExt[ext] || 'audio/ogg';
      const { error: upErr } = await supabase.storage.from('newsroom-audio')
        .upload(path, file, { contentType, upsert: false });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      setBusy('Listening and transcribing — this can take a minute…');
      const r = await newsroomAI<{ transcript: string; draft: Draft }>('transcribe_voice', { path, interviewee, role, topic });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setBusy(null); }
  };

  const save = async () => {
    if (!result) return;
    setBusy('Saving draft…'); setError(null);
    try {
      const id = await createDraftArticle(result.draft, { categorySlug: category });
      setSavedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the draft');
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Mic className="w-5 h-5 text-red-600" /> Voice note → interview</h2>
        <p className="text-sm text-gray-600 mt-1">
          Send someone 4–5 questions on WhatsApp. When their voice note comes back, save it from WhatsApp (Share → Save to Files),
          upload it here, and you get a transcript plus an interview draft in their own words.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Who is speaking? *</span>
            <input className={input} value={interviewee} onChange={(e) => setInterviewee(e.target.value)} placeholder="e.g. Adebayo Okonkwo" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Who they are</span>
            <input className={input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. registered nurse in Calgary, moved from Ibadan in 2019" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">What you asked about</span>
            <input className={input} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. getting a nursing licence in Alberta" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">Category</span>
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
              {['lifestyle', 'immigration', 'finance', 'business', 'education', 'health', 'society', 'technology', 'politics'].map((c) =>
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <Upload className="w-4 h-4" /> {file ? file.name : 'Choose voice note'}
            <input type="file" accept="audio/*,.ogg,.opus,.m4a,.mp3,.aac,.amr,.wav" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button onClick={run} disabled={!file || !interviewee.trim() || !!busy} className={btnPrimary}>
            <Mic className="w-4 h-4" /> Transcribe and draft
          </button>
          <span className="text-xs text-gray-500">Up to {MAX_MB} MB (about 20 minutes of WhatsApp audio).</span>
        </div>
        {busy && <p className="text-sm text-gray-600 mt-3">{busy}</p>}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      {result && (
        <div className={card}>
          <h3 className="font-bold text-gray-900">{result.draft.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{result.draft.description}</p>
          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Transcript — check names and figures against this</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-lg p-3 max-h-96 overflow-auto font-sans">{result.transcript}</pre>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Draft</p>
              <div className="article-rich-content text-sm bg-gray-50 rounded-lg p-3 max-h-96 overflow-auto" dangerouslySetInnerHTML={{ __html: result.draft.content }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {savedId
              ? <Link to={editLink(savedId)} className={btnPrimary}>Open the draft to review and publish</Link>
              : <button onClick={save} disabled={!!busy} className={btnPrimary}>Save as hidden draft</button>}
            <p className="text-xs text-gray-500">Nothing is published until you open it, add a photo, and Save in Article Management.</p>
          </div>
        </div>
      )}
    </div>
  );
}
