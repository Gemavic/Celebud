import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://celebud.com";

interface ArticlePayload {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  category_name?: string;
  slug?: string;
}

async function postToTelegram(article: ArticlePayload): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const channelId = Deno.env.get("TELEGRAM_CHANNEL_ID");

  if (!botToken || !channelId) {
    console.log("Telegram not configured - skipping");
    return false;
  }

  const articleUrl = `${SITE_URL}/article/${article.id}`;
  const category = article.category_name
    ? `#${article.category_name.replace(/\s+/g, "").toLowerCase()}`
    : "";

  const message = [
    `*${escapeMarkdown(article.title)}*`,
    "",
    article.description
      ? escapeMarkdown(article.description.slice(0, 200)) +
        (article.description.length > 200 ? "..." : "")
      : "",
    "",
    category ? `${category} #celebud #news` : "#celebud #news",
    "",
    `[Read Full Article](${articleUrl})`,
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: channelId,
    text: message,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: false,
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const plainMessage = [
        article.title,
        "",
        article.description
          ? article.description.slice(0, 200) +
            (article.description.length > 200 ? "..." : "")
          : "",
        "",
        `Read: ${articleUrl}`,
      ]
        .filter(Boolean)
        .join("\n");

      const retryResp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          text: plainMessage,
          disable_web_page_preview: false,
        }),
      });

      if (!retryResp.ok) {
        console.error("Telegram post failed:", await retryResp.text());
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error("Telegram error:", err);
    return false;
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

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
          articles = [
            {
              id: data.id,
              title: data.title,
              description: data.description,
              thumbnail_url: data.thumbnail_url,
              category_name: (data as any).categories?.name,
            },
          ];
        }
      } else if (body.type === "recent") {
        const limit = body.limit || 5;
        const { data } = await supabase
          .from("media_content")
          .select("id, title, description, thumbnail_url, categories(name)")
          .eq("status", "published")
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

    const results = {
      telegram: [] as { id: string; success: boolean }[],
      shareLinks: [] as { id: string; links: ReturnType<typeof generateShareLinks> }[],
    };

    for (const article of articles) {
      const telegramSuccess = await postToTelegram(article);
      results.telegram.push({ id: article.id, success: telegramSuccess });
      results.shareLinks.push({ id: article.id, links: generateShareLinks(article) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: articles.length,
        results,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("share-to-socials error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
