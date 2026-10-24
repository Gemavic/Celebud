// /tributes/submit — families send CelebUD the story of someone they want
// to celebrate or remember. It reaches an editor in the Newsroom; nothing
// is published without the editor writing it up and checking it.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, CheckCircle, ArrowLeft, ImagePlus, X } from 'lucide-react';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { updateMetaTags } from '../utils/seo';

const field = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent';
const MAX_PHOTOS = 6;
const MAX_MB = 5;

export function TributeSubmitPage() {
  const [form, setForm] = useState({
    submitter_name: '', submitter_contact: '', relationship: '', honoree_name: '',
    occasion: 'birthday', occasion_date: '', story: '', quotes: '', consent: false, website: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateMetaTags({
      title: 'Send us a tribute | CelebUD',
      description: 'Celebrating a birthday, an achievement or a life well lived? Send CelebUD their story and photos and our editors will write a tribute.',
      type: 'website',
    });
  }, []);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const next = [...photos];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) { setError(`${f.name} is not a photo.`); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { setError(`${f.name} is over ${MAX_MB} MB — please send a smaller copy.`); continue; }
      if (next.length < MAX_PHOTOS) next.push(f);
    }
    setPhotos(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) { setState('done'); return; } // honeypot
    if (!form.consent) { setError('Please confirm you have the right to share this story and these photos.'); return; }
    setError(null); setState('sending');
    try {
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setStatus(`Uploading photo ${i + 1} of ${photos.length}…`);
        const f = photos[i];
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `pending/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('tribute-uploads').upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) throw new Error(`A photo could not be uploaded (${upErr.message}). Try a JPG or PNG under ${MAX_MB} MB.`);
        urls.push(supabase.storage.from('tribute-uploads').getPublicUrl(path).data.publicUrl);
      }
      setStatus('Sending your story…');
      // No .select(): submissions are write-only for visitors.
      const { error: err } = await supabase.from('tribute_submissions').insert({
        submitter_name: form.submitter_name.trim(),
        submitter_contact: form.submitter_contact.trim(),
        relationship: form.relationship.trim() || null,
        honoree_name: form.honoree_name.trim(),
        occasion: form.occasion,
        occasion_date: form.occasion_date || null,
        story: form.story.trim(),
        quotes: form.quotes.trim() || null,
        photos: urls,
        consent: true,
      });
      if (err) throw new Error(err.message.includes('Too many') ? err.message : 'Sorry, your story did not send. Please check the fields and try again.');
      setState('done');
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Something went wrong');
      setState('idle');
    } finally { setStatus(null); }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16 max-w-2xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-4 h-4 mr-1" /> CelebUD home</Link>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-wide text-red-600 flex items-center gap-2"><Heart className="w-4 h-4" /> Tributes</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">Celebrate someone special on CelebUD</h1>
          <p className="text-gray-600 mt-3">
            A birthday, an anniversary, an achievement, or a life to remember. Tell us their story in your own words and send a few photos.
            Our editors will write the tribute and contact you before it is published.
          </p>

          {state === 'done' ? (
            <div className="mt-8 p-5 bg-green-50 border border-green-200 rounded-xl">
              <p className="font-semibold text-green-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Thank you — your story has reached our editors.</p>
              <p className="text-sm text-green-800 mt-1">We'll contact you on the number or email you gave before anything is published.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-semibold text-gray-700">Who are we celebrating? *</span>
                  <input required minLength={2} maxLength={150} className={field} value={form.honoree_name} onChange={set('honoree_name')} placeholder="Full name" /></label>
                <label className="block"><span className="text-sm font-semibold text-gray-700">Occasion *</span>
                  <select className={field} value={form.occasion} onChange={set('occasion')}>
                    <option value="birthday">Birthday</option><option value="anniversary">Anniversary</option>
                    <option value="achievement">Achievement / graduation</option><option value="memorial">In memory of</option><option value="other">Other</option>
                  </select></label>
                <label className="block"><span className="text-sm font-semibold text-gray-700">Date of the occasion</span>
                  <input type="date" className={field} value={form.occasion_date} onChange={set('occasion_date')} /></label>
                <label className="block"><span className="text-sm font-semibold text-gray-700">Your relationship to them</span>
                  <input maxLength={100} className={field} value={form.relationship} onChange={set('relationship')} placeholder="e.g. daughter, pastor, friend" /></label>
              </div>
              <label className="block"><span className="text-sm font-semibold text-gray-700">Their story *</span>
                <textarea required minLength={50} maxLength={8000} rows={8} className={field} value={form.story} onChange={set('story')}
                  placeholder="Who are they? What have they done, overcome or meant to you? Share real moments — the more specific, the better the tribute." />
                <span className="text-xs text-gray-500">{form.story.length}/8000 · at least 50 characters</span></label>
              <label className="block"><span className="text-sm font-semibold text-gray-700">Words from family and friends</span>
                <textarea maxLength={3000} rows={4} className={field} value={form.quotes} onChange={set('quotes')}
                  placeholder={'Messages you would like included, with who said them, e.g.\n"Mummy, you are our strength." — Tolu, her son'} /></label>

              <div>
                <span className="text-sm font-semibold text-gray-700">Photos (up to {MAX_PHOTOS}, {MAX_MB} MB each)</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(p)} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                      <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-white rounded-full border p-0.5" aria-label="Remove photo"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-gray-500 hover:bg-gray-50">
                      <ImagePlus className="w-5 h-5" /><span className="text-xs">Add</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">The first photo will be the main picture.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block"><span className="text-sm font-semibold text-gray-700">Your name *</span>
                  <input required minLength={2} maxLength={100} className={field} value={form.submitter_name} onChange={set('submitter_name')} /></label>
                <label className="block"><span className="text-sm font-semibold text-gray-700">Your phone (WhatsApp) or email *</span>
                  <input required minLength={5} maxLength={150} className={field} value={form.submitter_contact} onChange={set('submitter_contact')} /></label>
              </div>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" value={form.website} onChange={set('website')} />
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input type="checkbox" className="mt-1" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                <span>I have the right to share this story and these photos, and the person (or their family) is happy for CelebUD to publish a tribute. For a child, I am their parent or guardian.</span>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {status && <p className="text-sm text-gray-600">{status}</p>}
              <button type="submit" disabled={state === 'sending'} className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                {state === 'sending' ? 'Sending…' : 'Send our story'}
              </button>
              <p className="text-xs text-gray-500">Your contact details are only used to reach you about this tribute and are never published. <Link to="/privacy" className="underline">Privacy policy</Link>.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
