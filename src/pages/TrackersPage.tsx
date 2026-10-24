// /trackers — figures CelebUD's editors record over time (exchange rates,
// Express Entry draws, petrol prices), each with its source. A record
// nobody else keeps in one place for this audience.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LineChart } from 'lucide-react';
import { Header } from '../components/Header';
import { RemittanceCalculator } from '../components/RemittanceCalculator';
import { supabase } from '../lib/supabase';
import { updateMetaTags } from '../utils/seo';
import { TRACKERS, type TrackerDef, type TrackerEntry } from '../utils/trackers';

const COLORS = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed'];

function Sparkline({ series }: { series: { label: string; points: { x: number; y: number }[] }[] }) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return null;
  const W = 600, H = 160, P = 8;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => P + ((x - x0) / Math.max(1, x1 - x0)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / Math.max(1e-9, y1 - y0)) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" role="img" aria-label="Trend chart">
      {series.map((s, i) => s.points.length > 1 && (
        <polyline key={s.label} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="2.5" strokeLinejoin="round"
          points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} />
      ))}
    </svg>
  );
}

function TrackerCard({ def, entries }: { def: TrackerDef; entries: TrackerEntry[] }) {
  const series = useMemo(() => {
    const by: Record<string, TrackerEntry[]> = {};
    entries.forEach((e) => { (by[e.label || '—'] ||= []).push(e); });
    return Object.entries(by).map(([label, es]) => ({
      label,
      latest: es[0],
      points: [...es].reverse().map((e) => ({ x: new Date(e.observed_on).getTime(), y: Number(e.value) })),
    }));
  }, [entries]);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900">{def.name}</h2>
      <p className="text-sm text-gray-600 mt-1">{def.blurb}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 mt-4">Our editors are starting this record — check back soon.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 mt-4">
            {series.map((s, i) => (
              <div key={s.label} className="min-w-[10rem]">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: COLORS[i % COLORS.length] }}>
                  <span className="inline-block w-3 h-0.5" style={{ background: COLORS[i % COLORS.length] }} />{s.label}
                </p>
                <p className="text-2xl font-bold text-gray-900">{def.format(Number(s.latest.value))}</p>
                <p className="text-xs text-gray-500">
                  {def.valueLabel} · {new Date(s.latest.observed_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {s.latest.extra != null && def.extraLabel && ` · ${Number(s.latest.extra).toLocaleString()} ${def.extraLabel.toLowerCase()}`}
                </p>
              </div>
            ))}
          </div>
          <Sparkline series={series} />
          <details className="mt-2">
            <summary className="text-sm font-semibold text-gray-700 cursor-pointer">All recorded figures and sources</summary>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="py-1.5 pr-3">Date</th><th className="py-1.5 pr-3">{def.labelName}</th><th className="py-1.5 pr-3">{def.valueLabel}</th>{def.extraLabel && <th className="py-1.5 pr-3">{def.extraLabel}</th>}<th className="py-1.5">Source</th></tr></thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 whitespace-nowrap">{e.observed_on}</td>
                      <td className="py-1.5 pr-3">{e.label}</td>
                      <td className="py-1.5 pr-3 font-semibold">{def.format(Number(e.value))}</td>
                      {def.extraLabel && <td className="py-1.5 pr-3">{e.extra != null ? Number(e.extra).toLocaleString() : ''}</td>}
                      <td className="py-1.5 text-gray-600">{e.source_url ? <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="underline">source</a> : null}{e.note ? `${e.source_url ? ' · ' : ''}${e.note}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

export function TrackersPage() {
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  useEffect(() => {
    updateMetaTags({
      title: 'Naira rates, Express Entry draws & petrol prices — CelebUD Trackers',
      description: 'Naira to Canadian and US dollar, every Express Entry draw, and petrol pump prices, recorded over time with sources by CelebUD editors.',
      type: 'website',
    });
    (async () => {
      const { data } = await supabase.from('tracker_entries').select('*').order('observed_on', { ascending: false }).limit(1000);
      setEntries((data as TrackerEntry[]) || []);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16 max-w-4xl mx-auto px-4 space-y-6">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4 mr-1" /> CelebUD home</Link>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-red-600 flex items-center gap-2"><LineChart className="w-4 h-4" /> CelebUD Trackers</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">The numbers that shape life between Nigeria and Canada</h1>
          <p className="text-gray-600 mt-2">Recorded by our editors over time, every figure with its source.</p>
        </div>
        {TRACKERS.map((t) => <TrackerCard key={t.id} def={t} entries={entries.filter((e) => e.tracker === t.id)} />)}
        <RemittanceCalculator />
      </div>
    </div>
  );
}
