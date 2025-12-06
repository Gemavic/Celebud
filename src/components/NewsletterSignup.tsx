import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    try {
      const { error } = await supabase.from('newsletter_subscribers').insert({
        email,
        name,
        is_active: true,
      });

      if (error) {
        if (error.code === '23505') {
          setMessage('This email is already subscribed!');
          setStatus('error');
        } else {
          throw error;
        }
      } else {
        setMessage('Successfully subscribed! Check your inbox for confirmation.');
        setStatus('success');
        setEmail('');
        setName('');
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl shadow-2xl p-8 text-white">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
          <Mail className="w-8 h-8" />
        </div>
        <h3 className="text-3xl font-bold mb-2">Stay in the Loop</h3>
        <p className="text-white/90 mb-6">
          Get the latest celebrity news, exclusive interviews, and trending stories delivered to your inbox.
        </p>

        {status === 'success' ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-semibold">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-white"
              />
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-white"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-white text-red-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe Now'}
            </button>

            {status === 'error' && (
              <div className="flex items-center justify-center space-x-2 text-white">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{message}</p>
              </div>
            )}

            <p className="text-xs text-white/75">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
