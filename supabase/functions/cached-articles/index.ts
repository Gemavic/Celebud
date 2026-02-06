import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
};

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(params: URLSearchParams): string {
  const category = params.get('category') || 'all';
  const page = params.get('page') || '1';
  const pageSize = params.get('pageSize') || '12';
  const featured = params.get('featured') || '';
  const trending = params.get('trending') || '';
  return `articles:${category}:${page}:${pageSize}:${featured}:${trending}`;
}

function isValidCache(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const cacheKey = getCacheKey(params);

    const cached = cache.get(cacheKey);
    if (cached && isValidCache(cached.timestamp)) {
      return new Response(
        JSON.stringify({ ...cached.data, cached: true }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: { persistSession: false },
    });

    const category = params.get('category');
    const page = parseInt(params.get('page') || '1', 10);
    const pageSize = parseInt(params.get('pageSize') || '12', 10);
    const featured = params.get('featured') === 'true';
    const trending = params.get('trending') === 'true';

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;

    let query = supabase
      .from('media_content')
      .select('*, categories(*), authors(*)', { count: 'exact' })
      .order('published_at', { ascending: false });

    if (category) {
      query = query.eq('categories.slug', category);
    }

    if (featured) {
      query = query.eq('is_featured', true);
    }

    if (trending) {
      query = query.eq('is_trending', true);
    }

    const { data, error, count } = await query.range(startIndex, endIndex);

    if (error) throw error;

    const result = {
      articles: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      cached: false,
    };

    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
