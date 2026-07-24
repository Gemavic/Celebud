import { createClient } from 'npm:@supabase/supabase-js@2';

// Generates a short video clip from a text prompt using Google's Veo 3.1
// Lite model, via the same GEMINI_API_KEY as the other AI features. Video
// generation is a long-running operation (can take 1-3+ minutes), so this
// works as a two-step job the client polls:
//   { action: 'start', prompt, durationSeconds? } -> { operationName }
//   { action: 'status', operationName }            -> { done, url? }
// This avoids ever holding a single request open long enough to hit a
// platform timeout (the same class of bug that broke the article drafter
// with Anthropic/Opus earlier).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const VIDEO_MODEL = 'veo-3.1-lite-generate-preview';

interface VideoRequest {
  action: 'start' | 'status';
  prompt?: string;
  durationSeconds?: '4' | '6' | '8';
  operationName?: string;
}

async function requireAccess(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { ok: false, status: 401, error: 'Missing authorization header' };
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return { ok: false, status: 401, error: 'Invalid or expired session' };
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  const { data: creatorApp } = await supabase
    .from('creator_applications')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();
  const allowed = profile?.is_admin || (creatorApp && ['approved', 'onboarded'].includes(creatorApp.status));
  if (!allowed) return { ok: false, status: 403, error: 'Admin or approved creator access required' };
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const access = await requireAccess(req);
    if (!access.ok) {
      return new Response(JSON.stringify({ error: access.error }), {
        status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: VideoRequest = await req.json();

    if (body.action === 'start') {
      if (!body.prompt || !body.prompt.trim()) {
        return new Response(JSON.stringify({ error: 'A prompt is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fullPrompt = `${body.prompt.trim()}. Style: professional, high-quality social-media-ready footage. STRICT RULE: do not depict any real, identifiable public figure, celebrity, or named person — use only generic, unnamed people or purely conceptual/scenic footage.`;

      const startResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${VIDEO_MODEL}:predictLongRunning`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            instances: [{ prompt: fullPrompt }],
            parameters: {
              aspectRatio: '9:16',
              resolution: '720p',
              durationSeconds: body.durationSeconds || '8',
              personGeneration: 'allow_adult',
            },
          }),
        }
      );

      if (!startResp.ok) {
        const errText = await startResp.text();
        console.error('Veo start error:', startResp.status, errText);
        let detail = errText;
        try { detail = JSON.parse(errText)?.error?.message || errText; } catch { /* keep raw */ }
        if (startResp.status === 429) throw new Error('Video quota/rate limit reached — wait a bit or check your Google AI Studio billing.');
        throw new Error(`Could not start video generation (${startResp.status}): ${detail}`);
      }

      const startData = await startResp.json();
      const operationName = startData?.name;
      if (!operationName) {
        console.error('No operation name in Veo response:', JSON.stringify(startData).slice(0, 500));
        throw new Error('Video generation did not start correctly — please try again.');
      }

      return new Response(JSON.stringify({ success: true, operationName }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'status') {
      if (!body.operationName) {
        return new Response(JSON.stringify({ error: 'operationName is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pollResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${body.operationName}`,
        { headers: { 'x-goog-api-key': apiKey } }
      );
      if (!pollResp.ok) {
        const errText = await pollResp.text();
        console.error('Veo poll error:', pollResp.status, errText);
        throw new Error(`Could not check video status (${pollResp.status}).`);
      }
      const pollData = await pollResp.json();

      if (!pollData.done) {
        return new Response(JSON.stringify({ success: true, done: false }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (pollData.error) {
        console.error('Veo operation finished with error:', JSON.stringify(pollData.error).slice(0, 500));
        throw new Error(`Video generation failed: ${pollData.error.message || 'unknown error'} — try a different prompt.`);
      }

      const videoUri = pollData?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!videoUri) {
        console.error('No video URI in completed operation:', JSON.stringify(pollData).slice(0, 800));
        throw new Error('Video generation finished but returned no video — please try again.');
      }

      // Download the actual video bytes (the URI requires the API key to fetch).
      const videoResp = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey } });
      if (!videoResp.ok) {
        throw new Error(`Could not download the generated video (status ${videoResp.status}).`);
      }
      const videoBytes = new Uint8Array(await videoResp.arrayBuffer());

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const path = `ai-generated/video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
      const { error: upErr } = await supabase.storage.from('creator-media').upload(path, videoBytes, {
        contentType: 'video/mp4', cacheControl: '3600', upsert: false,
      });
      if (upErr) throw new Error(`Generated the video but could not save it: ${upErr.message}`);

      const { data: urlData } = supabase.storage.from('creator-media').getPublicUrl(path);

      return new Response(JSON.stringify({ success: true, done: true, url: urlData.publicUrl }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-creator-video error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
