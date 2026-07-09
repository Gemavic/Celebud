// supabase/functions/send-push-notification/index.ts
//
// Sends a breaking-news push notification to subscribed visitors.
//
// Call this manually from the admin dashboard when publishing a big
// story, or wire it into a database trigger / cron job later. Body:
//   {
//     "title": "Headline here",
//     "body": "One-line summary",
//     "url": "/article/<id>/<slug>",
//     "image": "https://...",       // optional
//     "category_id": "<uuid>"        // optional — omit to send to everyone
//   }
//
// Requires these secrets set in Supabase (Dashboard -> Edge Functions -> Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. "mailto:you@celebud.com")

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@celebud.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys are not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const {
      title,
      body,
      url = '/',
      image,
      category_id,
    }: { title: string; body: string; url?: string; image?: string; category_id?: string } =
      await req.json();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title and body are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth');
    if (category_id) {
      // Include subscribers who chose this category AND subscribers with
      // no category preference (they opted into everything).
      query = query.or(`category_id.eq.${category_id},category_id.is.null`);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body, url, image, tag: 'celebud-news' });

    let sent = 0;
    let expired = 0;
    const staleIds: string[] = [];

    await Promise.all(
      (subscriptions || []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          // 404/410 means the browser subscription no longer exists —
          // clean these up so future sends don't keep retrying them.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expired++;
            staleIds.push(sub.id);
          }
        }
      })
    );

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds);
    }

    return new Response(
      JSON.stringify({ sent, expired, total: subscriptions?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
