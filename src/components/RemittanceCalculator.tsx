// "What does it really cost to send money home?" — compares up to three
// transfer services against a reference exchange rate, showing the fee AND
// the money lost in the exchange rate, which is usually the bigger cost.
// Everything runs in the browser; the reader types the quotes they see.
import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Provider { name: string; fee: number; rate: number }

const ngn = (v: number) => `₦${Math.round(v).toLocaleString('en-NG')}`;
const cad = (v: number) => `C$${v.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RemittanceCalculator() {
  const [amount, setAmount] = useState(500);
  const [refRate, setRefRate] = useState(0);
  const [refNote, setRefNote] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([
    { name: 'Service A', fee: 0, rate: 0 },
    { name: 'Service B', fee: 0, rate: 0 },
    { name: 'Service C', fee: 0, rate: 0 },
  ]);

  // Start from the latest official rate an editor recorded on /trackers.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('tracker_entries').select('value, observed_on, label')
        .eq('tracker', 'ngn-cad').ilike('label', '%official%').order('observed_on', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        const v = Number(data.value);
        setRefRate(v);
        setRefNote(`Official rate recorded on ${data.observed_on}. Replace it with today's rate if it has moved.`);
      }
    })();
  }, []);

  const rows = useMemo(() => providers.map((p) => {
    const received = amount * p.rate;
    const markupCad = refRate > 0 && p.rate > 0 ? amount * (refRate - p.rate) / refRate : 0;
    const totalCost = p.fee + Math.max(0, markupCad);
    return { ...p, received, markupCad, totalCost, pct: amount > 0 ? (totalCost / amount) * 100 : 0 };
  }), [providers, amount, refRate]);

  const best = rows.filter((r) => r.rate > 0).reduce<null | typeof rows[number]>((b, r) => (!b || r.received - r.fee * r.rate > b.received - b.fee * b.rate ? r : b), null);

  const upd = (i: number, k: keyof Provider, v: string) =>
    setProviders((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: k === 'name' ? v : Number(v) || 0 } : p)));

  const numIn = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><Send className="w-5 h-5 text-emerald-600" /></div>
        <h3 className="text-lg font-bold text-gray-900">Sending money home: what it really costs</h3>
      </div>
      <p className="text-sm text-gray-600 mb-5">
        Transfer services make money twice: the fee you see, and a worse exchange rate than the real one. Type in the quotes each app shows you and compare.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <label className="block"><span className="text-xs font-semibold text-gray-600">Amount you send (C$)</span>
          <input className={numIn} inputMode="decimal" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></label>
        <label className="block"><span className="text-xs font-semibold text-gray-600">Reference rate (₦ per C$1)</span>
          <input className={numIn} inputMode="decimal" value={refRate || ''} onChange={(e) => { setRefRate(Number(e.target.value) || 0); setRefNote(null); }} placeholder="e.g. today's official rate" />
          {refNote && <span className="text-xs text-gray-500">{refNote}</span>}</label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b">
              <th className="py-2 pr-2">Service</th><th className="py-2 pr-2">Fee (C$)</th><th className="py-2 pr-2">Their rate (₦/C$)</th>
              <th className="py-2 pr-2">Family receives</th><th className="py-2 pr-2">True cost to you</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b last:border-0 ${best && r === best ? 'bg-emerald-50' : ''}`}>
                <td className="py-2 pr-2"><input className={numIn} value={r.name} onChange={(e) => upd(i, 'name', e.target.value)} /></td>
                <td className="py-2 pr-2 w-24"><input className={numIn} inputMode="decimal" value={r.fee || ''} onChange={(e) => upd(i, 'fee', e.target.value)} placeholder="0" /></td>
                <td className="py-2 pr-2 w-32"><input className={numIn} inputMode="decimal" value={r.rate || ''} onChange={(e) => upd(i, 'rate', e.target.value)} placeholder="from the app" /></td>
                <td className="py-2 pr-2 font-semibold whitespace-nowrap">{r.rate ? ngn(r.received) : '—'}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {r.rate && refRate ? <>{cad(r.totalCost)} <span className="text-xs text-gray-500">({r.pct.toFixed(1)}%: {cad(r.fee)} fee + {cad(Math.max(0, r.markupCad))} in the rate)</span></> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {best && best.rate > 0 && <p className="text-sm text-emerald-800 mt-3">Best value here: <strong>{best.name}</strong> — your family receives {ngn(best.received)}.</p>}
      <p className="text-xs text-gray-500 mt-3">Assumes the fee is paid on top of the amount sent. Rates change through the day; check the final quote in the app before you pay. Not financial advice.</p>
    </div>
  );
}
