import { createClient } from 'npm:@supabase/supabase-js@2';
import { detectImageTopic, pickStockImage, searchPexelsImage } from '../_shared/articleImages.ts';

// Matches a genuinely relevant photo to an article by its SUBJECT (wildfire,
// courtroom, nuclear, football...), for hand-written articles in Article
// Management. fetch-news and enrich-articles already use this exact same
// logic for fetched/rewritten articles — this exposes it to the manual
// editor too, which is the "photo library" the newsroom asked for.
//
// Free and real when PEXELS_API_KEY is set (pexels.com/api, free tier,
// commercial use, no attribution required). Falls back to CelebUD's own
// curated topic pools when it is not, so this never fails outright.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: profile } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, description, categorySlug, seed } = await req.json();
    if (!title?.trim()) {
      return new Response(JSON.stringify({ error: 'A title is required to match a photo.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const topic = detectImageTopic(title, description || '', categorySlug || null);
    // Seed defaults to the title so the same headline always gets the same
    // pick — useful if the button is pressed more than once by accident.
    const pickSeed = seed || title;

    const pexelsUrl = await searchPexelsImage(topic.query, pickSeed);
    const url = pexelsUrl || pickStockImage(topic.pool, pickSeed);

    return new Response(JSON.stringify({
      success: true,
      url,
      source: pexelsUrl ? 'pexels' : 'stock',
      topic: topic.pool,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('match-thumbnail error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
