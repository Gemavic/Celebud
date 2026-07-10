// supabase/functions/generate-sitemap/index.ts
//
// One function, three feeds (selected with ?type=):
//   (default)     -> full XML sitemap of every article, slug URLs included
//   ?type=news    -> Google News sitemap: articles from the last 48 hours
//                    with <news:news> tags (required for Google News)
//   ?type=rss     -> RSS 2.0 feed of the latest 50 articles (used by
//                    Google News Publisher Center, aggregators, readers)
//
// Routed via vercel.json: /sitemap.xml, /news-sitemap.xml, /feed.xml
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SITE_URL = 'https://celebud.com';
const SITE_NAME = 'CelebUD';
const SITE_DESCRIPTION =
  'Latest celebrity news, entertainment, politics, and financial education from CelebUD.';

interface Article {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  updated_at: string;
  published_at: string;
  categories?: { name: string } | null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function articlePath(article: Article): string {
  const slug = article.slug?.trim() || (article.title ? slugify(article.title) : '');
  return slug ? `/article/${article.id}/${slug}` : `/article/${article.id}`;
}

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlResponse(body: string, contentType = 'application/xml'): Response {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const type = new URL(req.url).searchParams.get('type') || 'sitemap';

    // --- Google News sitemap: last 48 hours only, per Google's spec ---
    if (type === 'news') {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: articles, error } = await supabase
        .from('media_content')
        .select('id, slug, title, description, updated_at, published_at')
        .gte('published_at', cutoff)
        .order('published_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
      xml += 'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';
      (articles || []).forEach((a: Article) => {
        xml += '  <url>\n';
        xml += `    <loc>${SITE_URL}${articlePath(a)}</loc>\n`;
        xml += '    <news:news>\n';
        xml += '      <news:publication>\n';
        xml += `        <news:name>${SITE_NAME}</news:name>\n`;
        xml += '        <news:language>en</news:language>\n';
        xml += '      </news:publication>\n';
        xml += `      <news:publication_date>${a.published_at}</news:publication_date>\n`;
        xml += `      <news:title>${escapeXml(a.title)}</news:title>\n`;
        xml += '    </news:news>\n';
        xml += '  </url>\n';
      });
      xml += '</urlset>';
      return xmlResponse(xml);
    }

    // --- RSS 2.0 feed: latest 50 articles ---
    if (type === 'rss') {
      const { data: articles, error } = await supabase
        .from('media_content')
        .select('id, slug, title, description, updated_at, published_at, categories(name)')
        .order('published_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
      xml += '<channel>\n';
      xml += `  <title>${SITE_NAME}</title>\n`;
      xml += `  <link>${SITE_URL}</link>\n`;
      xml += `  <description>${escapeXml(SITE_DESCRIPTION)}</description>\n`;
      xml += '  <language>en</language>\n';
      xml += `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
      xml += `  <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n`;
      (articles || []).forEach((a: Article) => {
        const url = `${SITE_URL}${articlePath(a)}`;
        xml += '  <item>\n';
        xml += `    <title>${escapeXml(a.title)}</title>\n`;
        xml += `    <link>${url}</link>\n`;
        xml += `    <guid isPermaLink="true">${url}</guid>\n`;
        if (a.description) xml += `    <description>${escapeXml(a.description)}</description>\n`;
        if (a.categories?.name) xml += `    <category>${escapeXml(a.categories.name)}</category>\n`;
        xml += `    <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>\n`;
        xml += '  </item>\n';
      });
      xml += '</channel>\n</rss>';
      return xmlResponse(xml, 'application/rss+xml');
    }

    // --- Default: full sitemap ---
    const { data: articles, error } = await supabase
      .from('media_content')
      .select('id, slug, title, updated_at, published_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const currentDate = new Date().toISOString();
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/fin-advisor', priority: '0.8', changefreq: 'daily' },
      { url: '/about', priority: '0.5', changefreq: 'monthly' },
      { url: '/contact', priority: '0.5', changefreq: 'monthly' },
      { url: '/editorial-standards', priority: '0.5', changefreq: 'monthly' },
      { url: '/editorial', priority: '0.6', changefreq: 'monthly' },
    ];

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    staticPages.forEach((page) => {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${SITE_URL}${page.url}</loc>\n`;
      sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += '  </url>\n';
    });
    (articles || []).forEach((article: Article) => {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${SITE_URL}${articlePath(article)}</loc>\n`;
      sitemap += `    <lastmod>${article.updated_at}</lastmod>\n`;
      sitemap += '    <changefreq>weekly</changefreq>\n';
      sitemap += '    <priority>0.8</priority>\n';
      sitemap += '  </url>\n';
    });
    sitemap += '</urlset>';
    return xmlResponse(sitemap);
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
