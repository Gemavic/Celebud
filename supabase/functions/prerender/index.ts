// supabase/functions/prerender/index.ts
//
// Serves fully-formed, crawlable HTML for bots and social-media link
// scrapers (Googlebot, Bingbot, facebookexternalhit, Twitterbot,
// LinkedInBot, Slackbot, WhatsApp, Discordbot, etc).
//
// WHY THIS EXISTS:
// Real users get the normal React SPA (fast, interactive). But bots that
// don't run JavaScript — which includes ALL social media link-preview
// scrapers, not just some search engines — currently see an empty shell.
// This function returns real HTML with the correct <title>, meta
// description, Open Graph tags, and NewsArticle JSON-LD for whichever
// article/category/home path is requested, built directly from your
// Supabase data. It does not replace your React app; it's an alternate
// response path used only for non-human requests (wired up in the
// Cloudflare Worker).

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SITE_URL = 'https://celebud.com';
const SITE_NAME = 'CelebUD';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function articlePath(article: { id: string; slug?: string | null; title?: string | null }): string {
  const slug = article.slug?.trim() || (article.title ? slugify(article.title) : '');
  return slug ? `/article/${article.id}/${slug}` : `/article/${article.id}`;
}

function escapeHtml(str: string) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseHtml({
  title,
  description,
  image,
  url,
  type,
  jsonLd,
  bodyHtml,
}: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type: 'website' | 'article';
  jsonLd: Record<string, unknown>;
  bodyHtml: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index, follow, max-image-preview:large" />

<meta property="og:type" content="${type}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="${SITE_NAME}" />
${image ? `<meta property="og:image" content="${image}" />` : ''}

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
${image ? `<meta name="twitter:image" content="${image}" />` : ''}

<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') || '/';

  try {
    // --- Article page: /article/:id ---
    const articleMatch = path.match(/^\/article\/([^/]+)/);
    if (articleMatch) {
      const id = articleMatch[1];
      const { data: article } = await supabase
        .from('media_content')
        .select('*, categories(name, slug), authors(name)')
        .eq('id', id)
        .maybeSingle();

      if (!article) {
        return new Response('Not found', { status: 404, headers: corsHeaders });
      }

      const url = `${SITE_URL}${articlePath(article)}`;
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.description,
        image: article.thumbnail_url ? [article.thumbnail_url] : undefined,
        datePublished: article.published_at,
        dateModified: article.updated_at,
        author: [{ '@type': 'Person', name: article.authors?.name || SITE_NAME }],
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      };

      const bodyHtml = `
<article>
  <h1>${escapeHtml(article.title)}</h1>
  <p>By ${escapeHtml(article.authors?.name || SITE_NAME)} — ${article.published_at}</p>
  ${article.thumbnail_url ? `<img src="${article.thumbnail_url}" alt="${escapeHtml(article.title)}" />` : ''}
  <div>${article.content || escapeHtml(article.description)}</div>
  ${article.categories ? `<p>Category: <a href="/?category=${article.categories.slug}">${escapeHtml(article.categories.name)}</a></p>` : ''}
</article>`;

      const html = baseHtml({
        title: `${article.title} - ${SITE_NAME}`,
        description: article.description || article.title,
        image: article.thumbnail_url || undefined,
        url,
        type: 'article',
        jsonLd,
        bodyHtml,
      });

      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // --- Homepage / category listing: / or /?category=x ---
    const category = searchParams.get('category');
    let query = supabase
      .from('media_content')
      .select('id, slug, title, description, thumbnail_url, published_at, categories(name, slug)')
      .order('published_at', { ascending: false })
      .limit(30);

    if (category) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .maybeSingle();
      if (cat) query = query.eq('category_id', cat.id);
    }

    const { data: articles } = await query;

    const listHtml = (articles || [])
      .map(
        (a) => `
    <li>
      <a href="${articlePath(a)}">
        <h2>${escapeHtml(a.title)}</h2>
        <p>${escapeHtml(a.description || '')}</p>
      </a>
    </li>`
      )
      .join('');

    const html = baseHtml({
      title: category
        ? `${category.charAt(0).toUpperCase() + category.slice(1)} News - ${SITE_NAME}`
        : `${SITE_NAME} - Latest Celebrity News, Entertainment & Exclusive Interviews`,
      description:
        'Stay updated with the latest celebrity news, entertainment updates, exclusive interviews, and trending stories.',
      url: category ? `${SITE_URL}/?category=${category}` : SITE_URL,
      type: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
      },
      bodyHtml: `<main><h1>Latest Stories</h1><ul>${listHtml}</ul></main>`,
    });

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    return new Response(`Prerender error: ${(err as Error).message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
