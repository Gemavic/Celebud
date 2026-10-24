// Featured-partner clicks by placement. Sign-ups are counted on the
// partner's side via the referral code and the utm_medium tag.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DATES_CARE, partnerUrl } from '../../utils/partners';

const LABELS: Record<string, string> = {
  'homepage-card': 'Homepage card',
  'in-article': 'Inside articles',
  'mobile-menu': 'Mobile menu',
  footer: 'Footer',
};

export function PartnersAdmin() {
  const [rows, setRows] = useState<{ placement: string; created_at: string }[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    supabase.from('partner_clicks').select('placement, created_at').eq('partner', DATES_CARE.id)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(5000)
      .then(({ data, error }) => { if (error) setErr(error.message); else setRows(data || []); });
  }, []);

  const weekAgo = Date.now() - 7 * 864e5;
  const dayAgo = Date.now() - 864e5;
  const by = (p: string, after: number) => rows.filter((r) => r.placement === p && Date.parse(r.created_at) > after).length;
  const placements = Array.from(new Set([...Object.keys(LABELS), ...rows.map((r) => r.placement)]));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900">Dates.care · featured partner</h2>
        <p className="text-sm text-gray-600 mt-1">
          Clicks from CelebUD to Dates.care. Sign-ups are credited to referral code <b>{DATES_CARE.ref}</b>; in Dates.care's own stats,
          <code className="mx-1">utm_source=celebud</code> and <code>utm_medium</code> show which placement brought each one.
        </p>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        <table className="w-full text-sm mt-4">
          <thead><tr className="text-left text-gray-500"><th className="py-2">Placement</th><th>Last 24h</th><th>7 days</th><th>30 days</th></tr></thead>
          <tbody>
            {placements.map((p) => (
              <tr key={p} className="border-t border-gray-100">
                <td className="py-2 font-medium text-gray-900">{LABELS[p] || p}</td>
                <td>{by(p, dayAgo)}</td><td>{by(p, weekAgo)}</td><td>{by(p, 0)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 font-bold"><td className="py-2">Total</td><td>{rows.filter((r) => Date.parse(r.created_at) > dayAgo).length}</td><td>{rows.filter((r) => Date.parse(r.created_at) > weekAgo).length}</td><td>{rows.length}</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-4">Link used on the homepage card: <span className="break-all">{partnerUrl('homepage-card')}</span></p>
      </div>
    </div>
  );
}
