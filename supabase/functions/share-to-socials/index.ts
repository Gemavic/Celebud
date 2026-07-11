import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://celebud.com";
const FACEBOOK_PAGE_ID = "61591656230605";

interface ArticlePayload {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  category_name?: string;
}

// ─── Facebook ───────────────────────────────────────────────────────────────

async function postToFacebook(article: ArticlePayload): Promise<{ success: boolean; post_id?: string; error?: string }> {
  const pageToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
  if (!pageToken) {
    return { success: false, error: "FACEBOOK_PAGE_ACCESS_TOKEN not configured" };
  }

  const articleUrl = `${SITE_URL}/article/${article.id}`;

  const excerpt = article.description
    ? (article.description.length > 280 ? article.description.slice(0, 277) + "..." : article.description)
    : "";

  const message = [
    article.title,
    excerpt ? `\n${excerpt}` : "",
    `\nRead more: ${articleUrl}`,
    "\n#CelebUD #News #Canada",
  ].join("");

  try {
    // If thumbnail is available, post as a photo with a caption — this guarantees the image shows
    if (article.thumbnail_url) {
      const photoBody = new URLSearchParams({
        url: article.thumbnail_url,
        caption: message,
        access_token: pageToken,
      });

      const photoResp = await fetch(
        `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: photoBody.toString(),
        }
      );

      const photoData = await photoResp.json() as Record<string, unknown>;

      if (photoResp.ok && !photoData.error) {
        return { success: true, post_id: (photoData.post_id || photoData.id) as string };
      }

      // If photo post fails (e.g. image URL not accessible), fall through to link post
      console.warn("Photo post failed, falling back to link post:", JSON.stringify(photoData));
    }

    // Link post with picture field to suggest thumbnail
    const feedParams: Record<string, string> = {
      message,
      link: articleUrl,
      access_token: pageToken,
    };
    if (article.thumbnail_url) {
      feedParams.picture = article.thumbnail_url;
      feedParams.name = article.title;
      if (excerpt) feedParams.description = excerpt;
    }

    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(feedParams).toString(),
      }
    );

    const data = await resp.json() as Record<string, unknown>;

    if (!resp.ok || data.error) {
      const errMsg = (data.error as any)?.message || JSON.stringify(data);
      console.error("Facebook post failed:", errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, post_id: data.id as string };
  } catch (err) {
    console.error("Facebook fetch error:", err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── Telegram ────────────────────────────────────────────────────────────────

async function postToTelegram(article: ArticlePayload): Promise<{ ok: boolean; error?: string }> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const channelId = Deno.env.get("TELEGRAM_CHANNEL_ID");
  if (!botToken || !channelId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured" };
  }

  const articleUrl = `${SITE_URL}/article/${article.id}`;
  const category = article.category_name
    ? `#${article.category_name.replace(/\s+/g, "").toLowerCase()}`
    : "";

  const baseUrl = `https://api.telegram.org/bot${botToken}`;

  // Build plain caption (safe — no markdown parsing, avoids all escape issues)
  const caption = [
    article.title,
    "",
    article.description ? article.description.slice(0, 250) + (article.description.length > 250 ? "..." : "") : "",
    "",
    category ? `${category} #celebud #news` : "#celebud #news",
    "",
    `Read: ${articleUrl}`,
  ].filter((line, idx, arr) => !(line === "" && (idx === 0 || idx === arr.length - 1))).join("\n");

  try {
    // If thumbnail available, post as photo with caption
    if (article.thumbnail_url) {
      const photoResp = await fetch(`${baseUrl}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          photo: article.thumbnail_url,
          caption: caption.slice(0, 1024), // Telegram caption limit
        }),
      });

      const photoData = await photoResp.json() as Record<string, unknown>;
      if (photoResp.ok && photoData.ok) {
        return { ok: true };
      }
      // Photo failed (bad URL, unsupported format, etc.) — fall through to text
      console.warn("Telegram photo post failed:", JSON.stringify(photoData));
    }

    // Plain text message — no markdown, guaranteed to work
    const textResp = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text: caption,
      }),
    });

    const textData = await textResp.json() as Record<string, unknown>;
    if (!textResp.ok || !textData.ok) {
      const errMsg = (textData.description as string) || JSON.stringify(textData);
      console.error("Telegram message failed:", errMsg);
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ─── Share link generators ────────────────────────────────────────────────────

function generateShareLinks(article: ArticlePayload) {
  const articleUrl = `${SITE_URL}/article/${article.id}`;
  const text = encodeURIComponent(article.title);
  const url = encodeURIComponent(articleUrl);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(article.title + " - Read on CelebUD: " + articleUrl)}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}&via=celebudmedia`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let articles: ArticlePayload[] = [];

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          facebook_configured: !!Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN"),
          telegram_configured: !!(Deno.env.get("TELEGRAM_BOT_TOKEN") && Deno.env.get("TELEGRAM_CHANNEL_ID")),
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();

      if (body.article) {
        articles = [body.article];
      } else if (body.article_id) {
        const { data } = await supabase
          .from("media_content")
          .select("id, title, description, thumbnail_url, categories(name)")
          .eq("id", body.article_id)
          .single();

        if (data) {
          articles = [{
            id: data.id,
            title: data.title,
            description: data.description,
            thumbnail_url: data.thumbnail_url,
            category_name: (data as any).categories?.name,
          }];
        }
      } else if (body.type === "recent") {
        const limit = body.limit || 5;
        const { data } = await supabase
          .from("media_content")
          .select("id, title, description, thumbnail_url, categories(name)")
          .eq("is_featured", true)
          .order("published_at", { ascending: false })
          .limit(limit);

        if (data) {
          articles = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            thumbnail_url: d.thumbnail_url,
            category_name: d.categories?.name,
          }));
        }
      }
    }

    const results: {
      id: string;
      facebook: { success: boolean; post_id?: string; error?: string };
      telegram: boolean;
      telegram_error?: string;
      shareLinks: ReturnType<typeof generateShareLinks>;
    }[] = [];

    for (const article of articles) {
      const [facebookResult, telegramResult] = await Promise.all([
        postToFacebook(article),
        postToTelegram(article),
      ]);

      results.push({
        id: article.id,
        facebook: facebookResult,
        telegram: telegramResult.ok,
        telegram_error: telegramResult.error,
        shareLinks: generateShareLinks(article),
      });
    }

    return new Response(
      JSON.stringify({ success: true, processed: articles.length, results }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("share-to-socials error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
