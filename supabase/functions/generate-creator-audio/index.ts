import { createClient } from 'npm:@supabase/supabase-js@2';

// Generates a short spoken-word audio clip from a topic: writes a brief
// script with Gemini text generation, then voices it with Gemini's
// text-to-speech model, wraps the raw PCM in a WAV container, and uploads
// it to the creator-media bucket. Used by Content Studio's "Generate with
// AI" option for audio posts. Uses the same GEMINI_API_KEY as the other
// AI features.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const TEXT_MODEL = 'gemini-flash-latest';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE_NAME = 'Kore';

interface AudioRequest {
  topic: string;
}

function pcmToWav(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Uint8Array {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmData, 44);
  return wavBytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
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

    // Allow admins OR creators with an approved/onboarded application.
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    const { data: creatorApp } = await supabase
      .from('creator_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    const allowed = profile?.is_admin || (creatorApp && ['approved', 'onboarded'].includes(creatorApp.status));
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Admin or approved creator access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { topic }: AudioRequest = await req.json();
    if (!topic || !topic.trim()) {
      return new Response(JSON.stringify({ error: 'A topic is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: write a short spoken-word script.
    const scriptPrompt = `Write a short spoken-word audio script for a celebrity/entertainment news platform on this topic: "${topic.trim()}".
Respond with ONLY a single JSON object, no markdown fences, no commentary: {"title": "...", "description": "...", "script": "..."}.
- "title": short catchy title, under 80 characters.
- "description": 1 sentence summary, under 150 characters.
- "script": 150-350 words of natural spoken narration (no headers, no markdown, no stage directions, no bullet points — just flowing sentences meant to be read aloud). Never fabricate quotes or facts; keep claims general if unsure.`;

    const textResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: scriptPrompt }] }] }),
      }
    );
    if (!textResp.ok) {
      const errText = await textResp.text();
      console.error('Script generation error:', textResp.status, errText);
      throw new Error(`Could not write the script (${textResp.status}). Try a different topic.`);
    }
    const textData = await textResp.json();
    const textCand = textData?.candidates?.[0];
    const rawScript: string = (textCand?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
    if (!rawScript) {
      console.error('Empty script response:', JSON.stringify(textData).slice(0, 800));
      throw new Error('Gemini did not return a script — please try again or rephrase the topic.');
    }
    let jsonStr = rawScript.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);
    let scriptData: { title?: string; description?: string; script?: string };
    try {
      scriptData = JSON.parse(jsonStr);
    } catch {
      throw new Error('Gemini returned malformed script output — please try again.');
    }
    const script = scriptData.script?.trim();
    if (!script) throw new Error('The script came back empty — please try again.');

    // Step 2: voice the script.
    const ttsResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: script }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
          },
        }),
      }
    );
    if (!ttsResp.ok) {
      const errText = await ttsResp.text();
      console.error('TTS error:', ttsResp.status, errText);
      let detail = errText;
      try { detail = JSON.parse(errText)?.error?.message || errText; } catch { /* keep raw */ }
      if (ttsResp.status === 429) throw new Error('Audio quota/rate limit reached — wait a minute or check your Google AI Studio billing.');
      throw new Error(`Voice generation failed (${ttsResp.status}): ${detail}`);
    }
    const ttsData = await ttsResp.json();
    const ttsParts = ttsData?.candidates?.[0]?.content?.parts || [];
    const audioPart = ttsParts.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data);
    if (!audioPart) {
      console.error('No audio in TTS response:', JSON.stringify(ttsData).slice(0, 800));
      throw new Error('The voice service did not return audio — please try again.');
    }
    const pcmBytes = Uint8Array.from(atob(audioPart.inlineData.data), (c) => c.charCodeAt(0));
    const wavBytes = pcmToWav(pcmBytes);

    const path = `ai-generated/audio-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
    const { error: upErr } = await supabase.storage.from('creator-media').upload(path, wavBytes, {
      contentType: 'audio/wav', cacheControl: '3600', upsert: false,
    });
    if (upErr) throw new Error(`Generated the audio but could not save it: ${upErr.message}`);

    const { data: urlData } = supabase.storage.from('creator-media').getPublicUrl(path);

    return new Response(JSON.stringify({
      success: true,
      url: urlData.publicUrl,
      title: scriptData.title || '',
      description: scriptData.description || '',
      script,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('generate-creator-audio error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
