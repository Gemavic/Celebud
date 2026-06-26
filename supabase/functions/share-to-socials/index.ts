import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://www.celebud.com";
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

  // Build a compelling post message
  const lines: string[] = [];
  lines.push(article.title);
  if (article.description) {
    const excerpt = article.description.length > 280
      ? article.description.slice(0, 277) + "..."
      : article.description;
    lines.push("", excerpt);
  }
  lines.push("", `Read more: ${articleUrl}`);
  lines.push("", "#CelebUD #News #Canada");

  const message = lines.join("\n");

  const body = new URLSearchParams({
    message,
    link: articleUrl,
    access_token: pageToken,
  });

  // If there's a thumbnail, use it as the og:image (Facebook will scrape it)
  // For direct image upload we'd need multipart; the link preview is sufficient

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
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

async function postToTelegram(article: ArticlePayload): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const channelId = Deno.env.get("TELEGRAM_CHANNEL_ID");
  if (!botToken || !channelId) return false;

  const articleUrl = `${SITE_URL}/article/${article.id}`;
  const category = article.category_name
    ? `#${article.category_name.replace(/\s+/g, "").toLowerCase()}`
    : "";

  const message = [
    `*${escapeMarkdown(article.title)}*`,
    "",
    article.description
      ? escapeMarkdown(article.description.slice(0, 200)) + (article.description.length > 200 ? "..." : "")
      : "",
    "",
    category ? `${category} #celebud #news` : "#celebud #news",
    "",
    `[Read Full Article](${articleUrl})`,
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text: message,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: false,
      }),
    });

    if (!resp.ok) {
      // Retry without markdown if formatting fails
      const plain = [
        article.title,
        article.description?.slice(0, 200) || "",
        `Read: ${articleUrl}`,
      ].filter(Boolean).join("\n\n");

      const retry = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: channelId, text: plain }),
      });
      return retry.ok;
    }
    return true;
  } catch {
    return false;
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
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
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
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
    } else if (req.method === "GET") {
      // Health check / status endpoint
      return new Response(
        JSON.stringify({
          status: "ok",
          facebook_configured: !!Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN"),
          telegram_configured: !!(Deno.env.get("TELEGRAM_BOT_TOKEN") && Deno.env.get("TELEGRAM_CHANNEL_ID")),
          facebook_page_id: FACEBOOK_PAGE_ID,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: {
      id: string;
      facebook: { success: boolean; post_id?: string; error?: string };
      telegram: boolean;
      shareLinks: ReturnType<typeof generateShareLinks>;
    }[] = [];

    for (const article of articles) {
      const [facebookResult, telegramOk] = await Promise.all([
        postToFacebook(article),
        postToTelegram(article),
      ]);

      results.push({
        id: article.id,
        facebook: facebookResult,
        telegram: telegramOk,
        shareLinks: generateShareLinks(article),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: articles.length,
        results,
      }),
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
