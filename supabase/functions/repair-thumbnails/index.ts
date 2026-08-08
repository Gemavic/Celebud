import { createClient } from 'npm:@supabase/supabase-js@2';
import { isDurableImageHost, resolvePublishableThumbnail } from '../_shared/articleImages.ts';

// Repairs articles whose thumbnail points at a publisher's own server.
//
// Those images look fine in the database and load fine when fetched from a
// server, but the publisher refuses to serve them to a browser that says it
// came from celebud.com — Tribune Online, Premium Times, Blueprint and
// Leadership all answer 403 Forbidden — so the reader sees a broken image
// icon. Measured on the live site: 497 published articles hotlinked a
// third-party image and 60 of them were already broken this way.
//
// For each article this downloads the publisher's photo once (the request
// they do allow), stores it in CelebUD's own bucket and repoints the
// article at that copy. If the photo cannot be retrieved at all it falls
// back to a real, on-subject Pexels photo. If neither can be secured the
// article is unpublished rather than left showing a broken picture.
//
// Runs in batches so a long archive cannot time out. Call it repeatedly
// until `remaining` reaches 0.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const DEFAULT_BATCH = 25;
// Supabase caps an edge function run; stop starting new work near the limit
// so whatever has been repaired is always saved and reported cleanly.
const TIME_BUDGET_MS = 100_000;

interface Row {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean | null;
  categories: { slug: string } | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const started = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Either an admin session, or a scheduler presenting the cron secret.
    const cronSecret = Deno.env.get('ENRICH_CRON_SECRET');
    const presentedSecret = req.headers.get('X-Cron-Secret');
    const isCron = Boolean(cronSecret && presentedSecret && presentedSecret === cronSecret);

    if (!isCron) {
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
    }

    const body = await req.json().catch(() => ({}));
    const batchSize: number = Math.min(Math.max(Number(body.limit) || DEFAULT_BATCH, 1), 100);
    // dryRun reports what would change without writing anything.
    const dryRun: boolean = body.dryRun === true;

    // Pull a working set and filter in code: "hostname is not one of ours"
    // is not something PostgREST can express as a single clean filter.
    const { data, error } = await supabase
      .from('media_content')
      .select('id, title, slug, description, thumbnail_url, is_published, categories(slug)')
      .eq('media_type', 'article')
      .not('thumbnail_url', 'is', null)
      .order('published_at', { ascending: false })
      .limit(1000);

    if (error) throw new Error(`Could not load articles: ${error.message}`);

    const rows = (data as unknown as Row[]) || [];
    const needsRepair = rows.filter((r) => !isDurableImageHost(r.thumbnail_url));
    const batch = needsRepair.slice(0, batchSize);

    let rehosted = 0;
    let replacedWithPexels = 0;
    let unpublished = 0;
    let failed = 0;
    const examples: string[] = [];

    if (!dryRun) {
      for (const row of batch) {
        if (Date.now() - started > TIME_BUDGET_MS) break;
        try {
          const resolved = await resolvePublishableThumbnail(supabase, {
            sourceImage: row.thumbnail_url,
            title: row.title,
            description: row.description,
            categorySlug: row.categories?.slug ?? null,
            seed: row.slug || row.id,
          });

          if (resolved) {
            const { error: upErr } = await supabase
              .from('media_content')
              .update({ thumbnail_url: resolved.url })
              .eq('id', row.id);
            if (upErr) throw new Error(upErr.message);

            if (resolved.source === 'publisher') rehosted++;
            else replacedWithPexels++;

            if (examples.length < 8) {
              examples.push(`${resolved.source === 'publisher' ? 're-hosted' : 'pexels'}: ${row.title.slice(0, 60)}`);
            }
          } else {
            // No picture can be secured — an article must not stay live
            // showing a broken image.
            const { error: upErr } = await supabase
              .from('media_content')
              .update({ is_published: false })
              .eq('id', row.id);
            if (upErr) throw new Error(upErr.message);
            unpublished++;
            if (examples.length < 8) examples.push(`unpublished: ${row.title.slice(0, 60)}`);
          }
        } catch {
          failed++;
        }
      }
    }

    const processed = dryRun ? 0 : rehosted + replacedWithPexels + unpublished + failed;

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      // How many still carry a non-durable thumbnail after this batch.
      remaining: Math.max(0, needsRepair.length - processed),
      needingRepairInWindow: needsRepair.length,
      processed,
      rehosted,
      replacedWithPexels,
      unpublished,
      failed,
      examples,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('repair-thumbnails error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
