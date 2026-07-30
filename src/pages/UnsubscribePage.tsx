// src/pages/UnsubscribePage.tsx
// One-click unsubscribe at /unsubscribe?id=<subscriber id>.
//
// Every newsletter carries a link here. Anti-spam law (CASL in Canada,
// CAN-SPAM in the US) requires that link to work without the reader having to
// log in or explain themselves, so this runs on page load with no extra step.
//
// Visitors cannot update newsletter_subscribers directly — the RLS policy
// blocks it. The unsubscribe_newsletter() function (SQL 40) is SECURITY
// DEFINER and touches only the single row named in the link.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export function UnsubscribePage() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const [status, setStatus] = useState<'working' | 'done' | 'notfound' | 'error'>('working');

  useEffect(() => {
    if (!id) { setStatus('notfound'); return; }

    (async () => {
      const { data, error } = await supabase.rpc('unsubscribe_newsletter' as never, { p_id: id });
      if (error) { setStatus('error'); return; }
      setStatus(data ? 'done' : 'notfound');
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">

            {status === 'working' && (
              <>
                <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Removing you from the list…</p>
              </>
            )}

            {status === 'done' && (
              <>
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">You have been unsubscribed</h1>
                <p className="text-gray-600 mb-6">
                  You will not receive any more emails from CelebUD. No hard feelings —
                  you are welcome back any time.
                </p>
                <Link
                  to="/"
                  className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Back to CelebUD
                </Link>
              </>
            )}

            {status === 'notfound' && (
              <>
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Nothing to unsubscribe</h1>
                <p className="text-gray-600 mb-6">
                  This link is incomplete, or that address has already been removed.
                  Either way, you are not on the list.
                </p>
                <Link
                  to="/"
                  className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Back to CelebUD
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-gray-600 mb-6">
                  We could not complete that just now. Please email{' '}
                  <a href="mailto:histogm@gmail.com" className="text-red-600 underline">
                    histogm@gmail.com
                  </a>{' '}
                  and we will remove you by hand.
                </p>
                <Link
                  to="/"
                  className="inline-block px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Back to CelebUD
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
