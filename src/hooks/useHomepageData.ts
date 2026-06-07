import { useQuery } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface UseHomepageDataOptions {
  category?: string;
  page?: number;
  pageSize?: number;
  search?: string;
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

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/homepage-data?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Homepage data fetch failed: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
