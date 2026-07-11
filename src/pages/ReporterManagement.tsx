// src/pages/ReporterManagement.tsx
// CEO/Editor dashboard at /admin/reporters: review reporter applications
// (approve or reject with a comment) and manually register reporters.
// Approval automatically creates/links the byline in `authors` and grants
// editorial access, so no SQL is ever needed to onboard a reporter.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';

interface ReporterApplication {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone_number: string | null;
  bio: string | null;
  coverage_areas: string | null;
  portfolio_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export function ReporterManagement() {
  const { user, profile } = useAuth();
  const [apps, setApps] = useState<ReporterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<{ app: ReporterApplication; approve: boolean } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Manual registration modal state
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regComment, setRegComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reporter_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApps((data as ReporterApplication[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-28 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-xl shadow-sm max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to access Reporter Management.</p>
            <Link to="/" className="inline-flex items-center mt-4 text-red-600 hover:text-red-700 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (!reviewTarget.approve && !comment.trim()) {
      setModalError('Please give the applicant a short reason.');
      return;
    }
    setBusy(true);
    setModalError(null);
    try {
      const { data, error } = await supabase.rpc('review_reporter_application', {
        p_application_id: reviewTarget.app.id,
        p_approve: reviewTarget.approve,
        p_comment: comment || null,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || 'Failed');
      setNotice(
        reviewTarget.approve
          ? `${reviewTarget.app.full_name} approved — byline created and editorial access granted.`
          : `${reviewTarget.app.full_name}'s application was rejected.`
      );
      setReviewTarget(null);
      setComment('');
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setModalError(null);
    try {
      const { data, error } = await supabase.rpc('admin_register_reporter', {
        p_full_name: regName,
        p_email: regEmail,
        p_phone_number: regPhone || null,
        p_bio: regBio || null,
        p_comment: regComment || null,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; error?: string; linked?: boolean };
      if (!result.success) {
        throw new Error(
          result.error === 'duplicate_email'
            ? 'A reporter with this email already exists.'
            : result.error || 'Failed'
        );
      }
      setNotice(
        result.linked
          ? `${regName} registered and linked to their existing account.`
          : `${regName} registered. When they sign up with ${regEmail} and apply at /reporters/apply, their account links automatically.`
      );
      setShowRegister(false);
      setRegName(''); setRegEmail(''); setRegPhone(''); setRegBio(''); setRegComment('');
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = apps.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.coverage_areas || '').toLowerCase().includes(q)
    );
  });

  const stats = {
    total: apps.length,
    pending: apps.filter((a) => a.status === 'pending').length,
    approved: apps.filter((a) => a.status === 'approved').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reporter Management</h1>
              <p className="mt-1 text-gray-500">
                Review applications from <span className="font-mono text-sm">/reporters/apply</span> or register reporters yourself
              </p>
            </div>
            <button
              onClick={() => { setShowRegister(true); setModalError(null); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Register Reporter
            </button>
          </div>

          {notice && (
            <div className="mb-6 flex items-start justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} className="text-blue-400 hover:text-blue-600 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {([['Total', stats.total, 'text-gray-900'], ['Pending', stats.pending, 'text-amber-600'], ['Approved', stats.approved, 'text-green-600'], ['Rejected', stats.rejected, 'text-red-600']] as const).map(
              ([label, value, color]) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              )
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or beat…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={load}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* List */}
          {loading && <p className="text-center text-gray-500 py-12">Loading applications…</p>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-gray-500">No applications {filter !== 'all' ? `with status “${filter}”` : 'yet'}.</p>
              <p className="text-sm text-gray-400 mt-1">
                Share <span className="font-mono">celebud.com/reporters/apply</span> with prospective reporters.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {filtered.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{app.full_name}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${STATUS_BADGE[app.status]}`}>
                        {app.status}
                      </span>
                      {!app.user_id && (
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                          no account yet
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{app.email}</span>
                      {app.phone_number && (
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{app.phone_number}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setReviewTarget({ app, approve: true }); setComment(''); setModalError(null); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => { setReviewTarget({ app, approve: false }); setComment(''); setModalError(null); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>

                {app.coverage_areas && (
                  <p className="mt-3 text-sm text-gray-600"><span className="font-medium text-gray-700">Covers:</span> {app.coverage_areas}</p>
                )}
                {app.bio && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{app.bio}</p>}
                {app.portfolio_url && (
                  <a
                    href={app.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Portfolio
                  </a>
                )}
                {app.review_comment && app.status !== 'pending' && (
                  <p className="mt-3 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-600">Your comment:</span> “{app.review_comment}”
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approve / Reject modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <button onClick={() => setReviewTarget(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {reviewTarget.approve ? 'Approve' : 'Reject'} {reviewTarget.app.full_name}?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {reviewTarget.approve
                ? 'This creates their byline and grants editorial access immediately.'
                : 'The applicant will see your comment on their application page.'}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment {reviewTarget.approve ? '(optional)' : '(required)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder={reviewTarget.approve ? 'Welcome aboard!' : 'Reason for the decision…'}
            />
            {modalError && <p className="mt-2 text-sm font-medium text-red-600">{modalError}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setReviewTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={busy}
                className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-lg disabled:opacity-50 ${
                  reviewTarget.approve ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {busy ? 'Saving…' : reviewTarget.approve ? 'Approve Reporter' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual registration modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Register a Reporter</h3>
            <p className="text-sm text-gray-500 mb-4">
              Onboards them instantly. If the email has no account yet, it links automatically once they
              sign up and visit the application page.
            </p>
            <form onSubmit={submitRegister} className="space-y-3">
              <input required value={regName} onChange={(e) => setRegName(e.target.value)} className={inputClass} placeholder="Full name (byline) *" />
              <input required type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputClass} placeholder="Email *" />
              <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className={inputClass} placeholder="Phone (optional)" />
              <textarea value={regBio} onChange={(e) => setRegBio(e.target.value)} rows={2} className={inputClass} placeholder="Short bio (optional)" />
              <input value={regComment} onChange={(e) => setRegComment(e.target.value)} className={inputClass} placeholder="Internal note (optional)" />
              {modalError && <p className="text-sm font-medium text-red-600">{modalError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? 'Registering…' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
