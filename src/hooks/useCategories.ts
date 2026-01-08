import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useSearchArticles(searchQuery: string) {
  return useQuery({
    queryKey: ['articles', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('media_content')
        .select('*, categories(*), authors(*)')
        .or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`
        )
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.trim().length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
