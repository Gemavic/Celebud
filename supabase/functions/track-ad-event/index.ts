import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TrackRequest {
  ad_id: string;
  event: 'impression' | 'click';
  ad_position?: string;
  ad_type?: string;
  page_url?: string;
  referrer?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const { allowed, remaining, resetTime } = checkRateLimit(`ad-event:${clientIp}`, {
    maxRequests: 60,
    windowMs: 60000,
  });
  const rateLimitHeaders = getRateLimitHeaders(allowed, remaining, resetTime);

  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: TrackRequest = await req.json();
    const { ad_id, event } = body;

    if (!ad_id || (event !== 'impression' && event !== 'click')) {
      return new Response(
        JSON.stringify({ error: 'ad_id and a valid event ("impression" or "click") are required' }),
        { status: 400, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userAgent = req.headers.get('user-agent') || '';

    await supabase.rpc('increment_ad_stat', { p_ad_id: ad_id, p_event: event });

    await supabase.from('ad_impressions').insert({
      ad_id,
      clicked: event === 'click',
      user_agent: userAgent,
      user_ip: clientIp,
    });

    if (event === 'click') {
      await supabase.from('ad_clicks').insert({
        article_id: null,
        ad_position: body.ad_position || 'unknown',
        ad_type: body.ad_type || 'banner',
        referrer: body.referrer || null,
        user_agent: userAgent,
        page_url: body.page_url || null,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('track-ad-event error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
