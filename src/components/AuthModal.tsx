import { useState, useEffect } from 'react';
import { X, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Provider } from '@supabase/supabase-js';

type ModalMode = 'signin' | 'signup' | 'forgot' | 'forgot_sent';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
}

export default function AuthModal({ isOpen, onClose, mode: initialMode }: AuthModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithOAuth, resetPassword } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setEmail('');
      setPassword('');
      setUsername('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getFriendlyError = (err: any): string => {
    const msg = (err?.message || err?.error_description || '').toString();
    if (msg.includes('User already registered') || msg.includes('already registered')) return 'An account with this email already exists. Please sign in instead.';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) return 'Incorrect email or password. Please try again.';
    if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) return 'Your email is not yet confirmed. Please check your inbox or use "Forgot password?" to resend.';
    if (msg.includes('duplicate key') && msg.includes('username')) return 'This username is already taken. Please choose another.';
    if (msg.includes('Password should be at least') || msg.includes('password')) return 'Password must be at least 8 characters long.';
    if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || msg.includes('too many')) return 'Too many attempts. Please wait a few minutes and try again.';
    if (msg.includes('Database error') || msg.includes('database')) return 'A server error occurred. Please try again in a moment.';
    if (msg.includes('signup_disabled') || msg.includes('Signups not allowed')) return 'Account registration is temporarily unavailable. Please contact the admin.';
    if (msg.includes('email') && msg.includes('invalid')) return 'Please enter a valid email address.';
    // Show the actual message if unknown, to help debug
    return msg ? `Error: ${msg}` : 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (mode === 'signup' && password.length < 8) { setError('Password must be at least 8 characters long.'); return; }
    if (mode === 'signup' && (username.trim().length < 3 || username.trim().length > 30)) {
      setError('Username must be between 3 and 30 characters.'); return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, username.trim());
      } else {
        await signIn(email, password);
      }
      onClose();
      setEmail(''); setPassword(''); setUsername('');
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      setMode('forgot_sent');
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: Provider) => {
    setError('');
    setLoading(true);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      setError(getFriendlyError(err));
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setEmail(''); setPassword(''); setUsername(''); setError('');
    setMode(initialMode);
  };

  // --- Forgot password sent confirmation ---
  if (mode === 'forgot_sent') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-8 m-4 text-center">
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your inbox</h2>
          <p className="text-gray-600 mb-2">
            We sent a password reset link to:
          </p>
          <p className="font-semibold text-gray-900 mb-6 break-all">{email}</p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to set a new password. If you don't see it, check your spam folder.
          </p>
          <button
            onClick={() => { setMode('signin'); setError(''); }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // --- Forgot password form ---
  if (mode === 'forgot') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-8 m-4">
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>

          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Reset your password</h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending reset link...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setMode('signin'); setError(''); }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Sign in / Sign up form ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-8 m-4">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-3xl font-bold mb-6 text-gray-900">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Facebook login hidden until the Meta app is reactivated (Live mode
              at developers.facebook.com) — with the app inactive, Meta shows
              users an "App not active" error instead of the login screen. */}

          <button
            type="button"
            onClick={() => handleOAuthSignIn('twitter')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
            </svg>
            Continue with X
          </button>

          <button
            type="button"
            onClick={() => handleOAuthSignIn('apple')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Choose a username (3-30 characters)"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
