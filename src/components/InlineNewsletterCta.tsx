// src/components/InlineNewsletterCta.tsx
// Compact email capture shown where readers actually are: at the end of an
// article and on the FIN-ADVISOR/Originals pages. The big homepage
// NewsletterSignup stays as-is; ~90% of social visitors land directly on an
// article and never scroll the homepage, so this is the version most people
// will ever see.
//
// Writes to the same newsletter_subscribers table (insert-only under RLS —
// visitors can sign up but can never read the list back).
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle } from 'lucide-react';

interface Props {
  /** Where the signup happened, stored in preferences for later analysis. */
  source: 'article' | 'fin-advisor' | 'originals';
  /** Optional tighter styling for narrow slots. */
  compact?: boolean;
}

const SIGNED_UP_KEY = 'celebud-newsletter-done';

export function InlineNewsletterCta({ source, compact = false }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  // Someone who already subscribed should not be nagged on every article.
  const [alreadyDone] = useState(() => {
    try { return localStorage.getItem(SIGNED_UP_KEY) === '1'; } catch { return false; }
  });

  if (alreadyDone && status !== 'success') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setStatus('loading');

    const { error } = await supabase.from('newsletter_subscribers').insert({
      email: clean,
      is_active: true,
      preferences: { source },
    });

    // 23505 = unique violation: they are already subscribed, which from the
    // reader's point of view is a success, not an error.
    if (error && error.code !== '23505') {
      setStatus('error');
      setMessage('Something went wrong — please try again.');
      return;
    }

    try { localStorage.setItem(SIGNED_UP_KEY, '1'); } catch { /* private mode */ }
    setStatus('success');
    setMessage(
      error?.code === '23505'
        ? 'You are already on the list — thank you!'
        : 'You are in! Watch your inbox for our next edition.'
    );
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', { send_to: 'AW-7665832939/q0OhCOunrcccEI6wy_ND' });
    }
  };

  if (status === 'success') {
    return (
      <div className="my-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
        <p className="text-sm font-medium text-emerald-800">{message}</p>
      </div>
    );
  }

  return (
    <div className={`my-8 rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-gray-100 ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900">
            {source === 'fin-advisor' || source === 'originals'
              ? 'Money & insurance guidance, straight to your inbox'
              : 'Enjoying this? Get our best stories by email'}
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {source === 'fin-advisor' || source === 'originals'
              ? 'Practical guides for newcomers and families in Canada — no spam, unsubscribe any time.'
              : 'One concise email with our top reporting. No spam, unsubscribe any time.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-label="Email address for the newsletter"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors flex-shrink-0"
        >
          {status === 'loading' ? 'Joining…' : 'Subscribe free'}
        </button>
      </form>

      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">{message}</p>
      )}
      <p className="mt-3 text-xs text-gray-400">
        We respect your privacy. Unsubscribe with one click, any time.
      </p>
    </div>
  );
}
