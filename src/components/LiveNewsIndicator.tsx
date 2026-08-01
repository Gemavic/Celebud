import { RefreshCw, Radio } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Previously this called the fetch-news edge function directly from every
// visitor's browser, on a click AND on an unattended 6-hour auto-repeat per
// open tab. fetch-news had no authentication at all, so this amounted to a
// public, unrated trigger for real backend work (source scraping, image
// lookups, database writes) — and with real traffic, or even one forgotten
// long-lived tab, that fired far more often than intended. It is the actual
// explanation for daily import volume landing at 5-6x the configured target
// despite a per-run cap, since nothing capped how many times a run could
// start in the first place.
//
// fetch-news is now admin/cron-only (returns 401 to anyone else), so this
// component no longer tries to invoke it. It still gives the homepage a
// "live" feel by refreshing the article list from what is already in the
// database — genuinely new content, brought in by the scheduled import or
// an admin action, appears without a page reload, at zero backend cost.
export function LiveNewsIndicator() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!autoRefresh) return;
    // A short interval is safe now that this only re-reads existing data —
    // there is no backend cost to invalidating the cache.
    const intervalId = setInterval(handleRefresh, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, handleRefresh]);

  return (
    <div className="fixed bottom-4 right-4 z-40 hidden md:block">
      <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-3 py-1.5 flex items-center space-x-2 border border-gray-200">
        {autoRefresh && (
          <div className="relative">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          </div>
        )}

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Check for newly published articles"
          className={`text-red-600 hover:text-red-700 flex items-center space-x-1 transition-all ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-xs font-medium">
            {isRefreshing ? '...' : 'Refresh'}
          </span>
        </button>

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`text-xs font-medium transition-all ${
            autoRefresh ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          {autoRefresh ? 'Live' : 'Off'}
        </button>
      </div>
    </div>
  );
}
