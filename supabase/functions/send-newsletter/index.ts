import { createClient } from 'npm:@supabase/supabase-js@2';

// Sends a newsletter edition to every active subscriber, via Resend.
//
// Deliberately simple and safe:
//   * admin-only (checked against profiles.is_admin)
//   * sends in batches with a pause, to stay inside provider rate limits
//   * every message carries a working unsubscribe link — required by
//     anti-spam law (CASL in Canada, CAN-SPAM in the US), not optional
//   * never returns subscriber addresses to the browser
//
// Requires these Supabase Edge Function secrets:
//   RESEND_API_KEY   from resend.com (free tier: 3,000 emails/month)
//   NEWSLETTER_FROM  e.g. "CelebUD <news@celebud.com>" — the domain must be
//                    verified in Resend or delivery will fail

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SITE_URL = 'https://celebud.com';

// Resend accepts up to 100 recipients per batch call.
const BATCH_SIZE = 50;
const PAUSE_MS = 1100;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Turns the plain text an editor typed into safe HTML paragraphs, making
 * bare URLs clickable. Escaping happens BEFORE linkifying so pasted markup
 * cannot inject anything into the email.
 */
function toHtmlBody(text: string): string {
  return text
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const safe = escapeHtml(line).replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#dc2626;">$1</a>'
      );
      return `<p style="margin:0 0 16px;line-height:1.6;color:#1f2937;">${safe}</p>`;
    })
    .join('\n');
}

function wrapEmail(subject: string, bodyHtml: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 4px;font-size:22px;color:#111827;">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">From CelebUD</p>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;" />
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      You are receiving this because you subscribed at
      <a href="${SITE_URL}" style="color:#6b7280;">celebud.com</a>.<br />
      <a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // --- Admin only -------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const caller = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await caller.auth.getUser();
    if (userErr || !user) {
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

    // --- Configuration ----------------------------------------------------
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('NEWSLETTER_FROM');
    if (!apiKey || !from) {
      return new Response(JSON.stringify({
        error:
          'Email sending is not configured yet. Add RESEND_API_KEY and NEWSLETTER_FROM ' +
          'in Supabase → Edge Functions → Secrets. Get a free key at resend.com and verify ' +
          'celebud.com as a sending domain first. Until then, use Export CSV and send from ' +
          'your existing mail provider.',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { subject, body } = await req.json().catch(() => ({}));
    if (!subject?.trim() || !body?.trim()) {
      return new Response(JSON.stringify({ error: 'A subject and body are both required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Recipients -------------------------------------------------------
    const { data: subs, error: subErr } = await supabase
      .from('newsletter_subscribers')
      .select('id, email')
      .eq('is_active', true);
    if (subErr) throw new Error(`Could not load subscribers: ${subErr.message}`);
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, message: 'No active subscribers.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bodyHtml = toHtmlBody(body);
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);

      // One request per recipient so each unsubscribe link is personal, but
      // dispatched together per batch to keep it fast.
      const results = await Promise.allSettled(batch.map((s) => {
        const unsubscribe = `${SITE_URL}/unsubscribe?id=${s.id}`;
        return fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: s.email,
            subject: subject.trim(),
            html: wrapEmail(subject.trim(), bodyHtml, unsubscribe),
            headers: {
              // Lets mail clients offer a one-click unsubscribe, which
              // materially improves inbox placement.
              'List-Unsubscribe': `<${unsubscribe}>`,
            },
          }),
        }).then(async (r) => {
          if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 120)}`);
        });
      }));

      results.forEach((r) => {
        if (r.status === 'fulfilled') sent++;
        else {
          failed++;
          if (errors.length < 5) {
            errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
          }
        }
      });

      // Breathe between batches so the provider's rate limit is not tripped.
      if (i + BATCH_SIZE < subs.length) {
        await new Promise((res) => setTimeout(res, PAUSE_MS));
      }
    }

    return new Response(JSON.stringify({ sent, failed, total: subs.length, errors }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-newsletter error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
