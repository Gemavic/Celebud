import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { PenTool, DollarSign, BarChart3, Send, CheckCircle2 } from 'lucide-react';

export function CreatorRevShare() {
  const { user } = useAuth();
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [topics, setTopics] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setFormState('submitting');

    const { error } = await supabase.from('creator_applications').insert({
      user_id: user.id,
      display_name: displayName,
      bio,
      portfolio_url: portfolioUrl || null,
      sample_topics: topics.split(',').map(t => t.trim()).filter(Boolean),
    });

    if (!error) {
      setFormState('success');
    } else {
      setFormState('idle');
    }
  }

  if (formState === 'success') {
    return (
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-green-900 mb-2">Application Submitted!</h3>
          <p className="text-green-700 text-sm">We'll review your application and get back within 48 hours. Welcome to the CelebUD creator program!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5 text-red-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Creator Program</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Write for CelebUD. <br />
              <span className="text-red-400">Earn 50% of ad revenue.</span>
            </h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Join our creator program and earn money from every article you publish.
              We split ad revenue 50/50 -- you write, we handle distribution, and you get paid monthly.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-white text-xs font-semibold">50/50 Split</p>
                <p className="text-gray-400 text-[10px]">Fair revenue share</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-white text-xs font-semibold">Real-Time Stats</p>
                <p className="text-gray-400 text-[10px]">Track your earnings</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <Send className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-white text-xs font-semibold">Monthly Payouts</p>
                <p className="text-gray-400 text-[10px]">Direct deposit</p>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-12 bg-white/5 backdrop-blur-sm">
            {user ? (
              <form onSubmit={handleApply} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Apply to Join</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Your writer name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Short Bio</label>
                  <textarea
                    required
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Tell us about your writing experience..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Portfolio URL (optional)</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="https://your-portfolio.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Topics you'd cover (comma-separated)</label>
                  <input
                    type="text"
                    required
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Celebrity news, Music, Fashion"
                  />
                </div>
                <button
                  type="submit"
                  disabled={formState === 'submitting'}
                  className="w-full py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {formState === 'submitting' ? 'Submitting...' : 'Apply Now'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <PenTool className="w-10 h-10 text-gray-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Sign in to Apply</h3>
                <p className="text-gray-400 text-sm mb-6">Create an account or sign in to join the creator program.</p>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setIsAuthModalOpen(true);
                    }}
                    className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      setIsAuthModalOpen(true);
                    }}
                    className="flex-1 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors text-sm"
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
