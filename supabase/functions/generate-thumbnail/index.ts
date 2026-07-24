import { createClient } from 'npm:@supabase/supabase-js@2';

// Generates an article thumbnail with Google's Gemini image model
// (gemini-2.5-flash-image, "Nano Banana") from the article title +
// description, uploads it to the `media` storage bucket, and returns the
// public URL. Uses the same GEMINI_API_KEY secret as the text drafter.
//
// For a news brand, the prompt deliberately produces CONCEPTUAL imagery and
// forbids depicting real, identifiable people — so an AI can never fabricate
// a photo of a real celebrity.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const IMAGE_MODEL = 'gemini-2.5-flash-image';

interface ThumbRequest {
  title: string;
  description?: string;
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Admin gate.
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
    const { data: callerProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, description }: ThumbRequest = await req.json();
    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'A title is required to generate a thumbnail' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Create a clean, modern, professional editorial thumbnail image for a news and magazine website article.
Article title: "${title.trim()}".
${description ? `Context: ${description.trim()}.` : ''}
Style: high-quality, visually engaging conceptual illustration or symbolic photography suitable as a 16:9 website article thumbnail.
STRICT RULES: Do NOT depict any real, identifiable public figure, celebrity, or named person. Use only generic, symbolic, or conceptual imagery. No text, letters, words, logos, or watermarks anywhere in the image.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;

    let resp: Response;
    try {
      resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
    } catch (netErr) {
      console.error('Gemini image network error:', netErr);
      throw new Error('Could not reach the image service. Please try again.');
    }

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gemini image API error:', resp.status, errText);
      let detail = errText;
      try { detail = JSON.parse(errText)?.error?.message || errText; } catch { /* keep raw */ }
      if (resp.status === 429) throw new Error('Image quota/rate limit reached — wait a minute or check your Google AI Studio billing.');
      if (resp.status === 400 && /API key not valid/i.test(detail)) throw new Error('The GEMINI_API_KEY looks invalid. Check the secret in Supabase.');
      throw new Error(`Thumbnail generation failed (${resp.status}): ${detail}`);
    }

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p?.inlineData?.data);
    if (!imgPart) {
      console.error('No image in Gemini response:', JSON.stringify(data).slice(0, 800));
      throw new Error('The image service did not return an image — please try again.');
    }

    const mimeType: string = imgPart.inlineData.mimeType || 'image/png';
    const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
    const bytes = Uint8Array.from(atob(imgPart.inlineData.data), (c) => c.charCodeAt(0));

    const path = `article-thumbnails/ai-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('media').upload(path, bytes, {
      contentType: mimeType, cacheControl: '3600', upsert: false,
    });
    if (upErr) throw new Error(`Generated the image but could not save it: ${upErr.message}`);

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);

    return new Response(JSON.stringify({ success: true, url: urlData.publicUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-thumbnail error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
