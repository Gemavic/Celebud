import { RefreshCw, Radio } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { fetchLatestNews } from '../services/newsService';
import { useQueryClient } from '@tanstack/react-query';

export function LiveNewsIndicator() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchLatestNews();
      setLastUpdate(new Date());
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    } catch (error) {
      console.error('Failed to refresh news:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      handleRefresh();
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, handleRefresh]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center space-x-3 border-2 border-red-500">
        <div className="flex items-center space-x-2">
          {autoRefresh && (
            <div className="relative">
              <Radio className="w-5 h-5 text-red-500" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
          )}
          <span className="text-sm font-semibold text-gray-700">
            Live News
          </span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all ${
            isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {isRefreshing ? 'Updating...' : 'Refresh Now'}
          </span>
        </button>

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            autoRefresh
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
        </button>
      </div>

      {lastUpdate && (
        <p className="text-xs text-gray-500 text-right mt-2">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
