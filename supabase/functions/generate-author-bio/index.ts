import { createClient } from 'npm:@supabase/supabase-js@2';

// Generates a short, article-specific "About the Author" bio + disclaimer
// via Google Gemini, for a human editor to review before saving (manual,
// on-demand only — never called from the unattended fetch-news pipeline).
// Uses the same GEMINI_API_KEY secret as the article drafter.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_MODEL = 'gemini-flash-latest';

interface BioRequest {
  authorName: string;
  expertiseContext?: string;
  articleTitle: string;
  articleCategory?: string;
  articleExcerpt?: string;
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

    const { authorName, expertiseContext, articleTitle, articleCategory, articleExcerpt }: BioRequest = await req.json();
    if (!authorName?.trim() || !articleTitle?.trim()) {
      return new Response(JSON.stringify({ error: 'authorName and articleTitle are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You write short, professional "About the Author" bios and disclaimers for a news and magazine website, tailored to one specific article so the bio reads as relevant to that article's topic — not a generic one-size-fits-all blurb.

OUTPUT: respond with a SINGLE JSON object and nothing else — no markdown code fences, no commentary. Exactly these keys:
- "bio": 2-3 sentences, third person, professional tone. Base it ONLY on the author background context given below — never invent credentials, titles, or qualifications the author wasn't described as having.
- "disclaimer": a short 1 sentence disclaimer IF this article's topic genuinely needs one (financial/insurance/investment advice: not financial advice, consult a licensed professional; health: not medical advice; legal: not legal advice), otherwise an empty string "" — most general news/entertainment/sports articles need no disclaimer at all, don't force one.`;

    const userPrompt = `Author: ${authorName}
Author background/context: ${expertiseContext?.trim() || '(no specific background provided — write a general professional journalist bio)'}

Article title: ${articleTitle}
Article category: ${articleCategory || '(unspecified)'}
${articleExcerpt ? `Article excerpt: ${articleExcerpt.slice(0, 800)}` : ''}

Write the "About the Author" bio and disclaimer for THIS article.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    let gemResp: Response;
    try {
      gemResp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      });
    } catch (netErr) {
      console.error('Gemini network error:', netErr);
      throw new Error('Could not reach the Gemini API. Please try again in a moment.');
    }

    if (!gemResp.ok) {
      const errText = await gemResp.text();
      console.error('Gemini API error:', gemResp.status, errText);
      let detail = errText;
      try { detail = JSON.parse(errText)?.error?.message || errText; } catch { /* keep raw */ }
      if (gemResp.status === 429) throw new Error('Gemini rate limit or quota reached — wait a minute and try again.');
      if (gemResp.status === 400 && /API key not valid/i.test(detail)) throw new Error('The GEMINI_API_KEY looks invalid. Double-check the secret in Supabase.');
      throw new Error(`Bio generation failed (Gemini ${gemResp.status}): ${detail}`);
    }

    const data = await gemResp.json();

    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      console.error('Gemini blocked the prompt:', blockReason);
      throw new Error(`Gemini declined this request (reason: ${blockReason}). Try adjusting the article details.`);
    }

    const cand = data?.candidates?.[0];
    const SAFETY_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY', 'RECITATION']);
    if (cand?.finishReason && SAFETY_FINISH_REASONS.has(cand.finishReason)) {
      console.error('Gemini finished with a safety-related reason:', cand.finishReason);
      throw new Error(`Gemini refused to complete this (reason: ${cand.finishReason}). Try different wording.`);
    }

    const rawText: string = (cand?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join('')
      .trim();
    if (!rawText) {
      console.error('Empty Gemini response:', JSON.stringify(data).slice(0, 800));
      throw new Error('Gemini returned no text — please try again.');
    }

    let jsonStr = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);

    let result: { bio?: string; disclaimer?: string };
    try {
      result = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse Gemini JSON. Raw:', rawText.slice(0, 1000));
      throw new Error('The AI returned malformed output — please try generating again.');
    }

    return new Response(JSON.stringify({
      success: true,
      bio: result.bio || '',
      disclaimer: result.disclaimer || '',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-author-bio error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
