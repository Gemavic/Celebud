// src/components/NotificationButton.tsx
import { useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Compact icon-button version, meant for the header. Renders nothing on
// browsers/devices that don't support Web Push (e.g. iOS Safari below
// version 16.4, or the site running outside an installed PWA on iOS).
export function NotificationButton() {
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const [justSubscribed, setJustSubscribed] = useState(false);

  if (permission === 'unsupported') return null;

  const handleClick = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      const ok = await subscribe();
      if (ok) {
        setJustSubscribed(true);
        setTimeout(() => setJustSubscribed(false), 2500);
      }
    }
  };

  const isDenied = permission === 'denied';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || isDenied}
      title={
        isDenied
          ? 'Notifications are blocked in your browser settings'
          : isSubscribed
            ? 'Turn off breaking news alerts'
            : 'Get breaking news alerts'
      }
      aria-pressed={isSubscribed}
      aria-label={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
        isDenied
          ? 'text-gray-300 cursor-not-allowed'
          : isSubscribed
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {justSubscribed ? (
        <BellRing className="w-5 h-5" />
      ) : isSubscribed ? (
        <Bell className="w-5 h-5 fill-current" />
      ) : isDenied ? (
        <BellOff className="w-5 h-5" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
    </button>
  );
}

// Larger inline card version, meant for a homepage prompt / settings page
// where you have room to explain what the visitor is opting into.
export function NotificationOptInCard() {
  const { permission, isSubscribed, loading, subscribe } = usePushNotifications();

  if (permission === 'unsupported' || permission === 'denied' || isSubscribed) return null;

  return (
    <div className="flex items-center gap-4 bg-red-50 border border-red-100 rounded-2xl p-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">Never miss breaking news</p>
        <p className="text-sm text-gray-600">Get notified the moment a big story drops.</p>
      </div>
      <button
        type="button"
        onClick={() => subscribe()}
        disabled={loading}
        className="flex-shrink-0 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Enabling…' : 'Enable'}
      </button>
    </div>
  );
}
