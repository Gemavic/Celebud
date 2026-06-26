import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { monitorQueryError } from '../utils/errorMonitoring';

interface UseArticlesOptions {
  category?: string;
  page?: number;
  pageSize?: number;
  featured?: boolean;
  trending?: boolean;
}

export function useArticles(options: UseArticlesOptions = {}) {
  const { category, page = 1, pageSize = 12, featured, trending } = options;

  return useQuery({
    queryKey: ['articles', { category, page, pageSize, featured, trending }],
    queryFn: async () => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;

      let query = supabase
        .from('media_content')
        .select(
          category
            ? '*, categories!inner(*), authors(*)'
            : '*, categories(*), authors(*)',
          { count: 'exact' }
        )
        .order('published_at', { ascending: false });

      if (category) {
        query = query.eq('categories.slug', category);
      }

      if (featured !== undefined) {
        query = query.eq('is_featured', featured);
      }

      if (trending !== undefined) {
        query = query.eq('is_trending', trending);
      }

      const { data, error, count } = await query.range(startIndex, endIndex);

      if (error) {
        monitorQueryError(['articles', 'list'], error);
        throw error;
      }

      return { articles: data || [], totalCount: count || 0 };
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useFeaturedArticles(limit = 5) {
  return useQuery({
    queryKey: ['articles', 'featured', limit],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('media_content')
        .select('*, categories(*), authors(*)')
        .eq('is_featured', true)
        .gte('published_at', thirtyDaysAgo)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        monitorQueryError(['articles', 'featured'], error);
        throw error;
      }
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useTrendingArticles(limit = 5) {
  return useQuery({
    queryKey: ['articles', 'trending', limit],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('media_content')
        .select('*, categories(*), authors(*)')
        .eq('is_trending', true)
        .gte('published_at', thirtyDaysAgo)
        .order('views_count', { ascending: false })
        .limit(limit);

      if (error) {
        monitorQueryError(['articles', 'trending'], error);
        throw error;
      }
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      // Race the Supabase query against a 15-second timeout so the loading
      // spinner never hangs forever (e.g. during a Supabase cold start).
      const fetchPromise = supabase
        .from('media_content')
        .select('*, categories(*), authors(*)')
        .eq('id', id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('The server is taking too long to respond. Please try again.')), 15000)
      );

      return Promise.race([fetchPromise, timeoutPromise]);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  });
}
