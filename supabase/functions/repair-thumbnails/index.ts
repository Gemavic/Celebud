import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  detectImageTopic,
  isDurableImageHost,
  isGenericStockImage,
  isPexelsRateLimited,
  resetPexelsRateLimit,
  resolvePublishableThumbnail,
  searchPexelsImage,
} from '../_shared/articleImages.ts';

// Fixes the two ways an article's picture can be wrong.
//
// BROKEN (mode 'broken') — the thumbnail points at the publisher's own
// server. It loads fine when fetched server-side but the publisher refuses
// to serve it to a browser that says it came from celebud.com: Tribune
// Online, Premium Times, Blueprint and Leadership all answer 403 Forbidden,
// so the reader sees a broken image icon. The photo is downloaded once (the
// request they do allow), stored in CelebUD's own bucket, and the article
// repointed at that copy. Failing that, a real on-subject Pexels photo.
// Failing both, the article is unpublished rather than left visibly broken.
//
// GENERIC (mode 'generic') — the thumbnail is one of the old curated
// category photos. Those load perfectly, so the broken-image pass ignored
// them, but each pool held only 3-6 images: measured live, 1,323 of 1,981
// published articles shared a duplicate picture, with 59 unrelated stories
// on a single stadium photo. Each one is upgraded to a real photo of its
// own subject.
//
// The two are handled differently on purpose. A generic image is not broken,
// so if no replacement can be found the article KEEPS it and stays live —
// only a genuinely broken picture can ever cause an unpublish. Without that
// split, a Pexels outage would have unpublished a thousand good articles.
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
  is_pinned: boolean | null;
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
    // 'broken'  — hotlinked images the reader cannot load (can unpublish)
    // 'generic' — duplicate category stock art (never unpublishes)
    const mode: 'broken' | 'generic' =
      body.mode === 'generic' ? 'generic' : 'broken';

    // Module state survives between warm invocations; a fresh call deserves
    // a fresh attempt at Pexels rather than inheriting an old 429.
    resetPexelsRateLimit();

    // Pull a working set and filter in code: "which host is this on" is not
    // something PostgREST can express as a single clean filter.
    // Generic-mode only touches LIVE articles — there is no point spending a
    // Pexels lookup on something readers cannot see.
    let query = supabase
      .from('media_content')
      .select('id, title, slug, description, thumbnail_url, is_published, is_pinned, categories(slug)')
      .eq('media_type', 'article')
      .not('thumbnail_url', 'is', null);
    if (mode === 'generic') query = query.eq('is_published', true);

    const { data, error } = await query
      .order('published_at', { ascending: false })
      .limit(1000);

    if (error) throw new Error(`Could not load articles: ${error.message}`);

    const rows = (data as unknown as Row[]) || [];
    const needsRepair = rows.filter((r) =>
      mode === 'generic'
        ? isGenericStockImage(r.thumbnail_url)
        : !isDurableImageHost(r.thumbnail_url)
    );
    const batch = needsRepair.slice(0, batchSize);

    let rehosted = 0;
    let replacedWithPexels = 0;
    let unpublished = 0;
    let needsManualPhoto = 0;
    let failed = 0;
    let leftAsIs = 0;
    let stoppedOnRateLimit = false;
    const examples: string[] = [];

    if (!dryRun) {
      for (const row of batch) {
        if (Date.now() - started > TIME_BUDGET_MS) break;
        // Pexels free tier is rate limited. Once it says 429 every further
        // lookup is wasted, so stop and let the caller resume later.
        if (isPexelsRateLimited()) { stoppedOnRateLimit = true; break; }

        try {
          if (mode === 'generic') {
            // The picture works, it is just not about this story. Find a
            // real photo of the actual subject; if none, keep what is there.
            const topic = detectImageTopic(
              row.title,
              row.description || '',
              row.categories?.slug ?? null
            );
            const better = await searchPexelsImage(topic.query, row.slug || row.id);
            if (!better) { leftAsIs++; continue; }

            const { error: upErr } = await supabase
              .from('media_content')
              .update({ thumbnail_url: better })
              .eq('id', row.id);
            if (upErr) throw new Error(upErr.message);

            replacedWithPexels++;
            if (examples.length < 8) examples.push(`upgraded: ${row.title.slice(0, 60)}`);
            continue;
          }

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
          } else if (row.is_pinned) {
            // Pinned = deliberately curated Originals content — an editor
            // chose to keep it live permanently. A missing photo is a real
            // problem, but this tool must never silently make that decision
            // for a pinned article; it stays live and gets reported instead,
            // for a human to add a photo by hand. The compliance gate
            // learned this same lesson the same way: an earlier version had
            // no pinned exemption and unpublished 62 Originals that were
            // otherwise perfectly fine.
            needsManualPhoto++;
            if (examples.length < 8) examples.push(`needs a manual photo (pinned, left live): ${row.title.slice(0, 60)}`);
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

    const processed = dryRun
      ? 0
      : rehosted + replacedWithPexels + unpublished + needsManualPhoto + failed + leftAsIs;

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      mode,
      // Pexels hourly limit hit — everything done so far is saved; resume later.
      stoppedOnRateLimit,
      // How many still need this kind of repair after this batch.
      remaining: Math.max(0, needsRepair.length - processed),
      needingRepairInWindow: needsRepair.length,
      processed,
      rehosted,
      replacedWithPexels,
      leftAsIs,
      unpublished,
      // Pinned articles with no resolvable photo — left live on purpose.
      needsManualPhoto,
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
