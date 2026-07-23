import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AdminLayout } from '../components/AdminLayout';
import { formatDistanceToNow } from '../utils/date';
import { Archive, RotateCcw, Search, RefreshCw, CheckCircle, AlertCircle, Filter } from 'lucide-react';

interface ArchivedRow {
  id: string;
  title: string;
  category_id: string | null;
  source_id: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  archived_at: string | null;
}

export function ArticleRecovery() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ArchivedRow[]>([]);
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [organicOnly, setOrganicOnly] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (profile?.is_admin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, organicOnly]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      let q = supabase
        .from('media_content_archive')
        .select('id, title, category_id, source_id, thumbnail_url, published_at, archived_at')
        .order('archived_at', { ascending: false })
        .limit(300);
      if (organicOnly) q = q.is('source_id', null);

      const [{ data: archived, error: aErr }, { data: cats }] = await Promise.all([
        q,
        supabase.from('categories').select('id, name'),
      ]);
      if (aErr) throw aErr;

      const list = (archived || []) as ArchivedRow[];
      setRows(list);
      setCatMap(Object.fromEntries((cats || []).map((c: any) => [c.id, c.name])));

      // Which of these archived ids are already live (so we can mark them)?
      const ids = list.map((r) => r.id);
      if (ids.length) {
        const { data: live } = await supabase
          .from('media_content')
          .select('id')
          .in('id', ids);
        setLiveIds(new Set((live || []).map((r: any) => r.id)));
      } else {
        setLiveIds(new Set());
      }
    } catch (err) {
      console.error('Recovery load error:', err);
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to load the archive' });
    } finally {
      setLoading(false);
    }
  }

  async function restore(id: string) {
    setRestoringId(id);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc('restore_archived_article', { p_id: id });
      if (error) throw error;
      const res = data as { success: boolean; error?: string } | null;
      if (res && res.success === false) throw new Error(res.error || 'Restore failed');
      setRestoredIds((prev) => new Set(prev).add(id));
      setLiveIds((prev) => new Set(prev).add(id));
    } catch (err) {
      console.error('Restore error:', err);
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Restore failed' });
    } finally {
      setRestoringId(null);
    }
  }

  async function restoreAllVisible() {
    const targets = filtered.filter((r) => !liveIds.has(r.id) && !restoredIds.has(r.id));
    if (targets.length === 0) return;
    setBulkRunning(true);
    setMessage(null);
    let ok = 0;
    for (const r of targets) {
      try {
        const { data, error } = await supabase.rpc('restore_archived_article', { p_id: r.id });
        if (error) throw error;
        const res = data as { success: boolean } | null;
        if (res && res.success === false) continue;
        ok++;
        setRestoredIds((prev) => new Set(prev).add(r.id));
        setLiveIds((prev) => new Set(prev).add(r.id));
      } catch {
        /* keep going; failures reported in the count */
      }
    }
    setBulkRunning(false);
    setMessage({ kind: 'ok', text: `Restored ${ok} of ${targets.length} article${targets.length === 1 ? '' : 's'} back to the live site.` });
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => !s || r.title.toLowerCase().includes(s));
  }, [rows, search]);

  const recoverableCount = filtered.filter((r) => !liveIds.has(r.id)).length;

  if (!profile?.is_admin) {
    return (
      <AdminLayout title="Recovery">
        <div className="text-center py-16 text-gray-500">Admin access required.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Recovery" subtitle="Restore archived or older articles back onto the live site">
      <div className="space-y-6">
        {/* Intro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <Archive className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Article Recovery</h2>
              <p className="text-sm text-gray-600 mt-1">
                Anything ever removed from the site is kept here. Click <strong>Restore</strong> to
                repost an article to its original category — great for recirculating older, still-relevant
                pieces. Restored articles are marked permanent and are never auto-removed.
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search archived articles by title…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setOrganicOnly((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              organicOnly ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            title="Toggle between your written articles and all archived content"
          >
            <Filter className="w-4 h-4" />
            {organicOnly ? 'Written articles only' : 'All archived content'}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
            message.kind === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {message.kind === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Bulk action */}
        {recoverableCount > 0 && (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-600">
              <strong>{recoverableCount}</strong> article{recoverableCount === 1 ? '' : 's'} can be restored
              {organicOnly ? ' (your written articles)' : ''}.
            </p>
            <button
              onClick={restoreAllVisible}
              disabled={bulkRunning}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {bulkRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Restore all shown
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Nothing in the archive matches.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const isLive = liveIds.has(r.id);
              const justRestored = restoredIds.has(r.id);
              return (
                <div key={r.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {r.thumbnail_url ? (
                      <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Archive className="w-5 h-5 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm line-clamp-2">{r.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                      <span className="font-medium text-gray-600">{(r.category_id && catMap[r.category_id]) || 'Uncategorized'}</span>
                      {r.source_id === null && <span className="text-red-600 font-medium">Written article</span>}
                      {r.archived_at && <span>archived {formatDistanceToNow(r.archived_at)}</span>}
                    </div>
                  </div>
                  {isLive || justRestored ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg flex-shrink-0">
                      <CheckCircle className="w-4 h-4" /> Live
                    </span>
                  ) : (
                    <button
                      onClick={() => restore(r.id)}
                      disabled={restoringId === r.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex-shrink-0"
                    >
                      {restoringId === r.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Restore
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
