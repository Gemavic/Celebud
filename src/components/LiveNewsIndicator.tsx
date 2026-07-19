import { RefreshCw, Radio } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { fetchLatestNews } from '../services/newsService';
import { useQueryClient } from '@tanstack/react-query';

export function LiveNewsIndicator() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchLatestNews();
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
