import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const FETCH_TIMEOUT = 8000;

interface UseHomepageDataOptions {
  category?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function fetchDirectFromSupabase(category: string, page: number, pageSize: number, search: string) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize - 1;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [categoriesRes, featuredRes, trendingRes, articlesRes] = await Promise.all([
    supabase.from('categories').select('*').gt('display_order', 0).order('display_order'),

    supabase
      .from('media_content')
      .select('*, categories(*), authors(*)')
      .eq('is_featured', true)
      .gte('published_at', thirtyDaysAgo)
      .order('published_at', { ascending: false })
      .limit(3),

    supabase
      .from('media_content')
      .select('*, categories(*), authors(*)')
      .eq('is_trending', true)
      .gte('published_at', thirtyDaysAgo)
      .order('views_count', { ascending: false })
      .limit(6),

    (() => {
      if (search) {
        return supabase
          .from('media_content')
          .select('*, categories(*), authors(*)')
          .or(`title.ilike.%${search}%,description.ilike.%${search}%`)
          .order('published_at', { ascending: false })
          .limit(20);
      }
      let q = supabase
        .from('media_content')
        .select(
          category ? '*, categories!inner(*), authors(*)' : '*, categories(*), authors(*)',
          { count: 'exact' }
        )
        .order('published_at', { ascending: false });
      if (category) {
        q = q.eq('categories.slug', category);
      }
      return q.range(startIndex, endIndex);
    })(),
  ]);

  return {
    categories: categoriesRes.data || [],
    featured: featuredRes.data || [],
    trending: trendingRes.data || [],
    articles: articlesRes.data || [],
    articlesCount: articlesRes.count ?? (articlesRes.data?.length || 0),
    editorial: [],
  };
}

export function useHomepageData(options: UseHomepageDataOptions = {}) {
  const { category, page = 1, pageSize = 12, search } = options;

  return useQuery({
    queryKey: ['homepage-data', { category, page, pageSize, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      try {
        const response = await fetchWithTimeout(
          `${SUPABASE_URL}/functions/v1/homepage-data?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          },
          FETCH_TIMEOUT
        );

        if (!response.ok) {
          throw new Error(`Edge function returned ${response.status}`);
        }

        return response.json();
      } catch {
        return fetchDirectFromSupabase(category || '', page, pageSize, search || '');
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
}
