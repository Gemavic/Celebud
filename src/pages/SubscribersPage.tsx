// src/pages/SubscribersPage.tsx
// Admin view of the newsletter list at /admin/subscribers.
//
// Two jobs:
//   1. Export the list as CSV, so it can be used with any mail provider
//      (Mailchimp, Brevo, Resend) without waiting on more code.
//   2. Compose and send an edition through the send-newsletter function.
//
// Reading this table requires an admin row in profiles — the RLS policy
// added in SQL 40 blocks everyone else, including anonymous visitors who
// previously could read every address.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AdminLayout } from '../components/AdminLayout';
import { Mail, Download, Send, RefreshCw, AlertTriangle, CheckCircle, Users } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  preferences: { source?: string } | null;
  subscribed_at: string;
}

export function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, name, is_active, preferences, subscribed_at')
      .order('subscribed_at', { ascending: false });

    if (error) {
      // The most likely cause is the RLS policy doing its job because the
      // signed-in account is not flagged as an admin.
      setLoadError(
        `Could not load subscribers: ${error.message}. ` +
        `If this says permission denied, the signed-in account needs is_admin set in profiles.`
      );
      setSubscribers([]);
    } else {
      setSubscribers((data as unknown as Subscriber[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => subscribers.filter((s) => s.is_active), [subscribers]);

  const bySource = useMemo(() => {
    const counts: Record<string, number> = {};
    subscribers.forEach((s) => {
      const src = s.preferences?.source || 'homepage';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [subscribers]);

  /** Download as CSV so the list works in any mail provider today. */
  const exportCsv = () => {
    // Quote every field and double internal quotes — an unescaped comma or
    // quote in a name would otherwise shift columns.
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['email', 'name', 'status', 'signed_up_from', 'subscribed_at'].join(','),
      ...subscribers.map((s) => [
        esc(s.email),
        esc(s.name),
        esc(s.is_active ? 'active' : 'unsubscribed'),
        esc(s.preferences?.source || 'homepage'),
        esc(s.subscribed_at),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celebud-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendNewsletter = async () => {
    if (!subject.trim() || !body.trim()) return;
    if (!confirm(
      `Send "${subject.trim()}" to ${active.length} active subscriber${active.length === 1 ? '' : 's'}?\n\n` +
      `This cannot be recalled once sent.`
    )) return;

    setSending(true);
    setSendError(null);
    setSendResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be signed in as an admin.');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Send failed (status ${res.status}).`);

      setSendResult(
        `Sent to ${json.sent} subscriber${json.sent === 1 ? '' : 's'}` +
        (json.failed ? `, ${json.failed} failed` : '') + '.'
      );
      setSubject('');
      setBody('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="Newsletter" subtitle="Your subscriber list and email editions">
      <div className="space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-600">Total subscribers</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{subscribers.length.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{active.length.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-600">Signed up from</p>
            <div className="mt-2 space-y-0.5">
              {bySource.length === 0 && <p className="text-sm text-gray-400">—</p>}
              {bySource.map(([src, n]) => (
                <p key={src} className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">{n}</span> {src}
                </p>
              ))}
            </div>
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{loadError}</p>
          </div>
        )}

        {/* Compose */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-red-600" /> Send an edition
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Goes to every <strong>active</strong> subscriber. Plain paragraphs are fine —
            each line becomes its own paragraph. Requires a RESEND_API_KEY on the server.
          </p>

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line"
            className="w-full px-4 py-3 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={'Write your edition here.\n\nOne paragraph per line. You can paste links — they will be clickable.'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={sendNewsletter}
              disabled={sending || !subject.trim() || !body.trim() || active.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {sending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send to {active.length}</>}
            </button>
            <button
              onClick={exportCsv}
              disabled={subscribers.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {sendResult && (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle className="w-4 h-4" /> {sendResult}
            </p>
          )}
          {sendError && (
            <p className="mt-3 flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {sendError}
            </p>
          )}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Subscribers</h2>
          </div>

          {loading ? (
            <p className="p-6 text-center text-gray-500">Loading…</p>
          ) : subscribers.length === 0 ? (
            <p className="p-6 text-center text-gray-500">
              No subscribers yet. The signup form appears at the end of every article.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold">Email</th>
                    <th className="text-left px-6 py-3 font-semibold">Name</th>
                    <th className="text-left px-6 py-3 font-semibold">From</th>
                    <th className="text-left px-6 py-3 font-semibold">Joined</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-900">{s.email}</td>
                      <td className="px-6 py-3 text-gray-600">{s.name || '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{s.preferences?.source || 'homepage'}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(s.subscribed_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.is_active ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
