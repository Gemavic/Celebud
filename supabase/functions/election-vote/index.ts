import { createClient } from 'npm:@supabase/supabase-js@2';

// Records one reader-poll vote for the Election 2027 hub.
//
// Integrity rules (all enforced here, not in the browser):
//   * one vote per device per poll (device_id, unique in the table)
//   * at most IP_LIMIT votes per network per hour — generous, because many
//     Nigerian mobile users share one public IP behind their carrier
//   * voting closes at the start of the legal blackout (Electoral Act 2026,
//     s.100(1)): 00:00 WAT the day before polling day
//   * the visitor's IP is never stored, only a salted hash of it
//
// Called from the browser with the public anon key.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
const IP_LIMIT = 60;
const ZONES = ['North-West', 'North-East', 'North-Central', 'South-West', 'South-East', 'South-South', 'Diaspora'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const { poll_slug, candidate_id, undecided, device_id, age_band, state, zone, gender, registered, website } = body as Record<string, unknown>;

    if (website) return json({ ok: true }); // honeypot
    if (typeof device_id !== 'string' || !UUID.test(device_id)) return json({ error: 'Please refresh the page and try again.' }, 400);

    const { data: poll } = await sb.from('election_polls').select('id, race, polling_day, is_open').eq('slug', String(poll_slug || '')).maybeSingle();
    if (!poll) return json({ error: 'Poll not found.' }, 404);

    const { data: blackout } = await sb.rpc('election_poll_in_blackout', { p_polling_day: poll.polling_day });
    const closesAt = new Date(`${poll.polling_day}T00:00:00+01:00`).getTime() - 24 * 3600 * 1000;
    if (!poll.is_open || blackout || Date.now() >= closesAt) {
      return json({ error: 'Voting in this poll has closed.' }, 409);
    }

    const isUndecided = undecided === true;
    if (!isUndecided) {
      if (typeof candidate_id !== 'string' || !UUID.test(candidate_id)) return json({ error: 'Please choose a candidate.' }, 400);
      const { data: cand } = await sb.from('election_candidates').select('id').eq('id', candidate_id).eq('race', poll.race).eq('is_active', true).maybeSingle();
      if (!cand) return json({ error: 'Please choose a candidate from the list.' }, 400);
    }

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
    const ip_hash = await sha256(`${ip}|${poll.id}|${Deno.env.get('SUPABASE_URL')}`);
    const { count } = await sb.from('election_poll_votes').select('id', { count: 'exact', head: true })
      .eq('poll_id', poll.id).eq('ip_hash', ip_hash).gte('created_at', new Date(Date.now() - 3600 * 1000).toISOString());
    if ((count ?? 0) >= IP_LIMIT) return json({ error: 'Too many votes from this network in the last hour. Please try again later.' }, 429);

    const clean = (v: unknown, allowed: string[]) => (typeof v === 'string' && allowed.includes(v) ? v : null);
    const { error } = await sb.from('election_poll_votes').insert({
      poll_id: poll.id,
      candidate_id: isUndecided ? null : candidate_id,
      undecided: isUndecided,
      device_id,
      ip_hash,
      age_band: clean(age_band, ['18-34', '35-49', '50-69', '70+']),
      state: typeof state === 'string' ? state.slice(0, 40) : null,
      zone: clean(zone, ZONES),
      gender: clean(gender, ['male', 'female']),
      registered: clean(registered, ['yes', 'no', 'unsure']),
    });
    if (error) {
      if (error.code === '23505') return json({ error: 'already_voted' }, 409);
      throw error;
    }

    const { data: results } = await sb.rpc('election_poll_results', { p_slug: poll_slug });
    return json({ ok: true, results });
  } catch (e) {
    console.error('election-vote error:', e);
    return json({ error: 'Your vote could not be recorded. Please try again.' }, 500);
  }
});
