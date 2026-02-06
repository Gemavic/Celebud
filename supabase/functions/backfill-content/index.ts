import { createClient } from 'npm:@supabase/supabase-js@2';
import { parse as parseHTML } from 'npm:node-html-parser@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function isValidArticleImage(imageUrl: string): boolean {
  const lowerUrl = imageUrl.toLowerCase();
  const excludeKeywords = [
    'logo', 'icon', 'avatar', 'channel', 'header', 'footer',
    'banner', 'badge', 'button', 'social', 'share', 'favicon',
    'sprite', 'ui', 'nav', 'menu', 'sidebar', 'widget',
    'ad', 'advertisement', 'sponsor', 'promo',
    'gravatar', 'profile-pic', 'placeholder.', 'default.',
    'spacer.', 'pixel.', 'trans.', 'invisible.',
  ];
  for (const kw of excludeKeywords) {
    if (lowerUrl.includes(kw)) return false;
  }
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  return validExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('image');
}

function resolveImageUrl(src: string, pageUrl: string): string {
  try {
    if (src.startsWith('//')) return `https:${src}`;
    if (src.startsWith('http')) return src;
    const base = new URL(pageUrl);
    if (src.startsWith('/')) return `${base.protocol}//${base.host}${src}`;
    const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
    return `${base.protocol}//${base.host}${basePath}${src}`;
  } catch {
    return src;
  }
}

const junkPatterns = [
  /^(share|tweet|comment|subscribe|follow|read more|latest|related)/i,
  /photograph(er)?:/i, /image\s+credit:/i, /photo\s+(by|credit|courtesy)/i,
  /getty\s+images/i,
  /^(published|updated|posted)\s+(on|at|:)/i,
  /^related\s+(stories|articles|posts)/i,
  /^(sign\s+up|log\s+in|register)/i,
  /^(facebook|twitter|instagram|linkedin|whatsapp)/i,
  /^share\s+(this|on|via)/i, /^source:/i,
  /^\d+\s+(week|day|hour|minute)s?\s+ago$/i, /^tags?:/i,
  /join.*whatsapp/i, /all rights reserved/i, /written permission/i,
  /^save this story/i, /casino utan/i,
  /delivered straight to your phone/i, /do you employ househelps/i,
];

function isJunk(text: string): boolean {
  return junkPatterns.some(p => p.test(text));
}

async function fetchContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return '';

    const html = await response.text();
    const root = parseHTML(html);

    const junkSelectors = [
      'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer',
      'aside', 'form', 'figcaption', 'svg',
      '[class*="comment"]', '[class*="sidebar"]', '[class*="widget"]',
      '[class*="advert"]', '[class*="banner"]', '[class*="social"]',
      '[class*="share"]', '[class*="newsletter"]', '[class*="related"]',
      '[class*="author-bio"]', '[class*="byline"]', '[class*="credit"]',
      '[class*="breadcrumb"]', '[class*="pagination"]', '[class*="tag-list"]',
      '[id*="comment"]', '[id*="sidebar"]',
    ];
    for (const sel of junkSelectors) {
      try { root.querySelectorAll(sel).forEach(el => el.remove()); } catch { /* skip */ }
    }

    const containerSelectors = [
      'article',
      '.article-body', '.article-content', '.article_body', '.article_content',
      '.post-content', '.post_content', '.entry-content', '.entry_content',
      '.story-body', '.story-content', '.story_body', '.story_content',
      '.td-post-content', '.content-body', '.content_body',
      '#article-body', '#article-content', '#story-body',
      '[itemprop="articleBody"]',
      'main',
    ];

    let source = null;
    for (const sel of containerSelectors) {
      try {
        const el = root.querySelector(sel);
        if (el) {
          const pars = el.querySelectorAll('p');
          const totalText = pars.map(p => p.text.trim()).filter(t => t.length > 30).join(' ');
          if (totalText.length > 200) {
            source = el;
            break;
          }
        }
      } catch { /* skip */ }
    }

    if (!source) source = root;

    const images: string[] = [];
    try {
      for (const img of source.querySelectorAll('img')) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src && !src.includes('data:image') && isValidArticleImage(src)) {
          images.push(resolveImageUrl(src, url));
        }
      }
    } catch { /* skip */ }

    const textParts: string[] = [];
    let imgIdx = 0;

    for (const p of source.querySelectorAll('p')) {
      const text = p.text.trim();
      if (text.length >= 30 && !isJunk(text)) {
        textParts.push(text);
        if (images[imgIdx] && textParts.length > 2 && textParts.length % 5 === 0) {
          textParts.push(`[IMAGE:${images[imgIdx]}]`);
          imgIdx++;
        }
      }
    }

    if (textParts.length < 3) {
      const allText = source.text;
      const sentences = allText.match(/[^.!?\n]+[.!?]+/g) || [];
      for (const sentence of sentences) {
        const cleaned = sentence.trim();
        if (cleaned.length > 40 && !isJunk(cleaned)) {
          textParts.push(cleaned);
        }
      }
    }

    const finalContent = textParts.join('\n\n');
    return finalContent.length > 100 ? finalContent : '';
  } catch {
    return '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const batchSize = 25;

    const { data: emptyArticles, error: fetchError } = await supabase
      .from('media_content')
      .select('id, title, external_url')
      .or('content.is.null,content.eq.')
      .not('external_url', 'is', null)
      .order('published_at', { ascending: false })
      .limit(batchSize);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!emptyArticles || emptyArticles.length === 0) {
      return new Response(JSON.stringify({ message: 'No empty articles to backfill', filled: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let filled = 0;
    let failed = 0;
    const results: { title: string; status: string }[] = [];

    for (const article of emptyArticles) {
      if (!article.external_url) continue;

      const content = await fetchContent(article.external_url);

      if (content && content.length > 100) {
        const { error: updateError } = await supabase
          .from('media_content')
          .update({ content })
          .eq('id', article.id);

        if (!updateError) {
          filled++;
          results.push({ title: article.title, status: 'filled' });
        } else {
          failed++;
          results.push({ title: article.title, status: 'update_error' });
        }
      } else {
        failed++;
        results.push({ title: article.title, status: 'no_content' });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${emptyArticles.length} articles`,
        filled,
        failed,
        remaining: emptyArticles.length - filled,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
