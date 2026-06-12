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
  Mail,
  Phone,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Globe,
} from 'lucide-react';

export function CreatorRevShare() {
  const { user } = useAuth();
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [topics, setTopics] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setFormState('submitting');
    setErrorMsg('');

    const { error } = await supabase.from('creator_applications').insert({
      user_id: user.id,
      display_name: displayName,
      email: email || null,
      phone_number: phoneNumber || null,
      bio,
      portfolio_url: portfolioUrl || null,
      sample_topics: topics.split(',').map(t => t.trim()).filter(Boolean),
      instagram_handle: instagramHandle ? instagramHandle.replace(/^@/, '') : null,
      tiktok_handle: tiktokHandle ? tiktokHandle.replace(/^@/, '') : null,
      twitter_handle: twitterHandle ? twitterHandle.replace(/^@/, '') : null,
      youtube_channel: youtubeChannel || null,
      facebook_url: facebookUrl || null,
    });

    if (!error) {
      setFormState('success');
    } else {
      setFormState('error');
      setErrorMsg(error.message.includes('duplicate') ? 'You have already submitted an application.' : 'Something went wrong. Please try again.');
    }
  }

  if (formState === 'success') {
    return (
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-900 mb-2">Application Submitted!</h3>
          <p className="text-emerald-700 max-w-md mx-auto">
            We'll review your application and get back to you within 48 hours. Welcome to the CelebUD creator program!
          </p>
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

          {/* Right: Application Form */}
          <div className="p-8 lg:p-12 bg-white/5 backdrop-blur-sm">
            {user ? (
              <form onSubmit={handleApply} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-1">Apply to Join</h3>
                <p className="text-xs text-gray-400 mb-4">Fields marked * are required</p>

                {formState === 'error' && (
                  <div className="p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-red-300 text-sm">
                    {errorMsg}
                  </div>
                )}

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Your creator name"
                  />
                </div>

                {/* Email + Phone row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300 mb-1">
                      <Mail className="w-3.5 h-3.5" /> Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="you@email.com"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300 mb-1">
                      <Phone className="w-3.5 h-3.5" /> Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Short Bio *</label>
                  <textarea
                    required
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                    placeholder="Tell us about your writing experience..."
                  />
                </div>

                {/* Topics */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Topics you'd cover *</label>
                  <input
                    type="text"
                    required
                    value={topics}
                    onChange={e => setTopics(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Celebrity news, Music, Fashion"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Comma-separated list</p>
                </div>

                {/* Social Media Handles */}
                <div>
                  <p className="text-xs font-semibold text-gray-300 mb-2">Social Media Handles</p>
                  <div className="space-y-2.5">
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pink-400" />
                      <input
                        type="text"
                        value={instagramHandle}
                        onChange={e => setInstagramHandle(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        placeholder="@instagram_handle"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="relative">
                        <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-400" />
                        <input
                          type="text"
                          value={twitterHandle}
                          onChange={e => setTwitterHandle(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="@x_handle"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/50 select-none">TT</span>
                        <input
                          type="text"
                          value={tiktokHandle}
                          onChange={e => setTiktokHandle(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="@tiktok_handle"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="relative">
                        <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-400" />
                        <input
                          type="text"
                          value={youtubeChannel}
                          onChange={e => setYoutubeChannel(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="YouTube channel name"
                        />
                      </div>
                      <div className="relative">
                        <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                        <input
                          type="url"
                          value={facebookUrl}
                          onChange={e => setFacebookUrl(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          placeholder="Facebook profile URL"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Portfolio */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300 mb-1">
                    <Globe className="w-3.5 h-3.5" /> Portfolio URL (optional)
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="https://your-portfolio.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formState === 'submitting'}
                  className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 text-sm shadow-lg shadow-red-900/30"
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
                    onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                    className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => { setAuthMode('signin'); setIsAuthModalOpen(true); }}
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
