import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import {
  PenTool,
  DollarSign,
  BarChart3,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';

export function CreatorRevShare() {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [bio, setBio] = useState('');
  const [topics, setTopics] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setStep('submitting');
    setErrorMsg('');

    const topicsArray = topics
      ? topics.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const { data, error } = await supabase.rpc('submit_creator_application', {
      p_display_name:  displayName.trim(),
      p_email:         email.trim(),
      p_phone_number:  phoneNumber.trim() || null,
      p_bio:           bio.trim() || null,
      p_topics:        topicsArray.length > 0 ? topicsArray : null,
      p_instagram:     instagramHandle.replace(/^@/, '').trim() || null,
      p_twitter:       twitterHandle.replace(/^@/, '').trim() || null,
    });

    if (error) {
      setStep('error');
      setErrorMsg('Something went wrong. Please try again.');
      return;
    }

    const result = data as { success: boolean; error?: string } | null;

    if (!result?.success) {
      setStep('error');
      if (result?.error === 'duplicate') {
        setErrorMsg('You have already submitted an application. Our team will contact you soon.');
      } else if (result?.error === 'Not authenticated') {
        setErrorMsg('Your session expired. Please refresh the page and try again.');
      } else {
        setErrorMsg(result?.error || 'Something went wrong. Please try again.');
      }
      return;
    }

    setStep('success');
  }

  if (step === 'success') {
    return (
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-10 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-900 mb-2">Application Received!</h3>
          <p className="text-emerald-700 text-sm leading-relaxed max-w-sm mx-auto">
            Our team will review your application within 24 hours. Once approved, you'll receive an email with next steps for verification and onboarding.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-emerald-600">
            <Clock className="w-4 h-4" />
            <span>Review within 24 hours</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left: Pitch */}
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5 text-red-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Creator Program</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Write for CelebUD.<br />
              <span className="text-red-400">Earn 50% of ad revenue.</span>
            </h2>
            <p className="text-gray-300 text-sm mb-8 leading-relaxed">
              Join our creator program and earn money from every article you publish.
              We split ad revenue 50/50 — you write, we handle distribution, you get paid monthly.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1.5" />
                <p className="text-white text-xs font-semibold">50/50 Split</p>
                <p className="text-gray-400 text-[10px] mt-0.5">Fair revenue share</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <BarChart3 className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                <p className="text-white text-xs font-semibold">Live Stats</p>
                <p className="text-gray-400 text-[10px] mt-0.5">Track your earnings</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <Send className="w-5 h-5 text-yellow-400 mx-auto mb-1.5" />
                <p className="text-white text-xs font-semibold">Monthly Pay</p>
                <p className="text-gray-400 text-[10px] mt-0.5">Direct deposit</p>
              </div>
            </div>

            {/* Process Steps */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">How it works</p>
              {[
                { icon: Zap, color: 'text-yellow-400', label: 'Apply in 30 seconds', sub: 'Name, email & phone — that\'s it' },
                { icon: Shield, color: 'text-blue-400', label: 'Admin reviews & approves', sub: 'Within 24 hours' },
                { icon: CheckCircle2, color: 'text-green-400', label: 'Get verified & onboarded', sub: 'Start writing and earning' },
              ].map(({ icon: Icon, color, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <p className="text-gray-500 text-[11px]">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className="p-8 lg:p-12 bg-white/5 backdrop-blur-sm flex flex-col justify-center">
            {user ? (
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Apply to Join</h3>
                  <p className="text-gray-400 text-sm mt-1">Fill 3 fields — done in 30 seconds</p>
                </div>

                {step === 'error' && (
                  <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-red-300 text-sm">
                    {errorMsg}
                  </div>
                )}

                {/* The 3 essential fields */}
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    placeholder="Your name or pen name *"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    placeholder="Email address *"
                  />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    placeholder="Phone number *"
                  />
                </div>

                {/* Optional extras — collapsed by default */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOptional(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showOptional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showOptional ? 'Hide' : 'Add'} optional details (bio, topics, socials)
                  </button>

                  {showOptional && (
                    <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                      <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none transition-all"
                        placeholder="Short bio (optional)"
                      />
                      <input
                        type="text"
                        value={topics}
                        onChange={e => setTopics(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                        placeholder="Topics: Celebrity, Sports, Tech (comma-separated)"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={instagramHandle}
                          onChange={e => setInstagramHandle(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                          placeholder="@Instagram"
                        />
                        <input
                          type="text"
                          value={twitterHandle}
                          onChange={e => setTwitterHandle(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                          placeholder="@X / Twitter"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={step === 'submitting'}
                  className="w-full py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 text-sm shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
                >
                  {step === 'submitting' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Apply Now — 30 Seconds
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-gray-500">
                  After approval, you'll receive verification & onboarding instructions via email
                </p>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                  <PenTool className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Ready to earn?</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-xs">
                  Create a free account or sign in to apply. Takes under a minute.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <button
                    onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                    className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm"
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => { setAuthMode('signin'); setIsAuthModalOpen(true); }}
                    className="flex-1 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors text-sm"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
      />
    </section>
  );
}
