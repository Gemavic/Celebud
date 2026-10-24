import { useCallback, useEffect, useState } from 'react';
import { LineChart, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TRACKERS, trackerById, type TrackerEntry, type TrackerId } from '../../utils/trackers';
import { btnPrimary, input, card } from './shared';

/** Editors record a figure (with its source) and the public /trackers page charts it. */
export function TrackersAdmin() {
  const [tracker, setTracker] = useState<TrackerId>('ngn-cad');
  const def = trackerById(tracker)!;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ observed_on: today, value: '', label: def.labelExamples[0], extra: '', source_url: '', note: '' });
  const [rows, setRows] = useState<TrackerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('tracker_entries').select('*').eq('tracker', tracker).order('observed_on', { ascending: false }).limit(50);
    setRows((data as TrackerEntry[]) || []);
  }, [tracker]);
  useEffect(() => { load(); setForm((f) => ({ ...f, label: trackerById(tracker)!.labelExamples[0], extra: '' })); }, [tracker, load]);

  const add = async () => {
    setError(null);
    const value = Number(form.value.replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) { setError('Enter the figure as a number.'); return; }
    if (!form.source_url.trim() && !form.note.trim()) { setError('Say where the figure came from — a link, or a note like "pump price I saw at Mobil, Bodija".'); return; }
    setSaving(true);
    const { error: e } = await supabase.from('tracker_entries').upsert({
      tracker, observed_on: form.observed_on, value, label: form.label.trim() || null,
      extra: form.extra ? Number(form.extra.replace(/,/g, '')) : null,
      source_url: form.source_url.trim() || null, note: form.note.trim() || null,
    }, { onConflict: 'tracker,observed_on,label' });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setForm((f) => ({ ...f, value: '', extra: '', note: '' }));
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('tracker_entries').delete().eq('id', id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><LineChart className="w-5 h-5 text-red-600" /> Trackers</h2>
        <p className="text-sm text-gray-600 mt-1">
          Record a figure whenever it changes; the public <a href="/trackers" target="_blank" className="underline">/trackers</a> page charts the history.
          A few minutes a week builds a record nobody else keeps, and readers come back to check it.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {TRACKERS.map((t) => (
            <button key={t.id} onClick={() => setTracker(t.id)}
              className={`px-3 py-1.5 text-sm rounded-full border ${tracker === t.id ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-300 text-gray-700'}`}>{t.name}</button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <label className="block"><span className="text-xs font-semibold text-gray-600">Date</span>
            <input type="date" className={input} value={form.observed_on} max={today} onChange={(e) => setForm({ ...form, observed_on: e.target.value })} /></label>
          <label className="block"><span className="text-xs font-semibold text-gray-600">{def.valueLabel}</span>
            <input className={input} inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
          <label className="block"><span className="text-xs font-semibold text-gray-600">{def.labelName}</span>
            <input className={input} list={`labels-${tracker}`} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <datalist id={`labels-${tracker}`}>{def.labelExamples.map((l) => <option key={l} value={l} />)}</datalist></label>
          {def.extraLabel && (
            <label className="block"><span className="text-xs font-semibold text-gray-600">{def.extraLabel}</span>
              <input className={input} inputMode="numeric" value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })} /></label>
          )}
          <label className="block"><span className="text-xs font-semibold text-gray-600">Source link</span>
            <input className={input} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://…" /></label>
          <label className="block"><span className="text-xs font-semibold text-gray-600">Note</span>
            <input className={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="optional" /></label>
        </div>
        <p className="text-xs text-gray-500 mt-2">Where to find it: {def.sourceHint}</p>
        <button className={`${btnPrimary} mt-3`} onClick={add} disabled={saving}><Plus className="w-4 h-4" /> Add figure</button>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className={`${card} p-0 divide-y divide-gray-100`}>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
            <span className="w-24 text-gray-500">{r.observed_on}</span>
            <span className="font-semibold w-28">{def.format(Number(r.value))}</span>
            <span className="flex-1 text-gray-700">{r.label}{r.extra != null && def.extraLabel ? ` · ${Number(r.extra).toLocaleString()} invited` : ''}{r.note ? ` · ${r.note}` : ''}</span>
            <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-red-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-500 p-5">No figures recorded yet.</p>}
      </div>
    </div>
  );
}
