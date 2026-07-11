// src/pages/ReporterSignup.tsx
// Public application form for new reporters at /reporters/apply.
// Applicants must be signed in (so their application links to their
// account); after submitting they see their status here, including the
// editor's comment if rejected.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { ArrowLeft, CheckCircle, Clock, PenLine, Send, XCircle } from 'lucide-react';

interface ReporterApplication {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  bio: string | null;
  coverage_areas: string | null;
  portfolio_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_comment: string | null;
  created_at: string;
}

export function ReporterSignup() {
  const { user } = useAuth();
  const [application, setApplication] = useState<ReporterApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverage, setCoverage] = useState('');
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState('');

  const loadApplication = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('reporter_applications')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setApplication((data as ReporterApplication) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_reporter_application', {
        p_full_name: fullName,
        p_email: email,
        p_phone_number: phone || null,
        p_bio: bio || null,
        p_coverage: coverage || null,
        p_portfolio_url: portfolio || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { success: boolean; error?: string; linked?: boolean };
      if (!result.success) {
        throw new Error(
          result.error === 'duplicate'
            ? 'You already have an application on file.'
            : result.error || 'Something went wrong.'
        );
      }
      setShowForm(false);
      await loadApplication();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-900';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <PenLine className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Become a CelebUD Reporter</h1>
            </div>
            <p className="text-gray-500 mb-8">
              Apply to join the CelebUD editorial team. Our editor reviews every application personally.
            </p>

            {!user && (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <p className="text-gray-700 font-medium mb-1">Sign in to apply</p>
                <p className="text-sm text-gray-500">
                  Use the Sign In button at the top of the page to create an account first — your
                  application is tied to your account so you can track its status here.
                </p>
              </div>
            )}

            {user && loading && <p className="text-gray-500 text-center py-8">Loading…</p>}

            {user && !loading && application && !showForm && (
              <div>
                {application.status === 'pending' && (
                  <div className="flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                    <Clock className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-800">Application under review</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Thanks {application.full_name} — your application was received and is waiting
                        for the editor's review. Check back here for the decision.
                      </p>
                    </div>
                  </div>
                )}
                {application.status === 'approved' && (
                  <div className="flex items-start gap-3 p-5 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800">You're a CelebUD reporter!</p>
                      <p className="text-sm text-green-700 mt-1">
                        Your application was approved{application.review_comment ? ` — “${application.review_comment}”` : '.'}
                      </p>
                      <Link
                        to="/admin/articles"
                        className="inline-block mt-3 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
                      >
                        Open the Editorial Dashboard
                      </Link>
                    </div>
                  </div>
                )}
                {application.status === 'rejected' && (
                  <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-6 h-6 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-red-800">Application not approved</p>
                        {application.review_comment && (
                          <p className="text-sm text-red-700 mt-1">
                            Editor's comment: “{application.review_comment}”
                          </p>
                        )}
                        <button
                          onClick={() => {
                            setFullName(application.full_name);
                            setEmail(application.email);
                            setPhone(application.phone_number || '');
                            setBio(application.bio || '');
                            setCoverage(application.coverage_areas || '');
                            setPortfolio(application.portfolio_url || '');
                            setShowForm(true);
                          }}
                          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700"
                        >
                          Apply Again
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {user && !loading && (!application || showForm) && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                    <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="e.g. Amusa Babatunde" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+234…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">What will you cover?</label>
                    <input value={coverage} onChange={(e) => setCoverage(e.target.value)} className={inputClass} placeholder="e.g. Sports, Nigerian politics" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tell us about yourself</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={inputClass} placeholder="Your experience, writing background, and why you want to join CelebUD" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio / previous work (link)</label>
                  <input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} className={inputClass} placeholder="https://…" />
                </div>

                {error && (
                  <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
