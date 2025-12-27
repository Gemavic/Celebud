import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  thumbnail?: string;
  content?: string;
}

function parseRSS(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/g);
  if (!itemMatches) return items;

  for (const itemXml of itemMatches) {
    const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] || itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[2] || '';
    const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[1] || itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[2] || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
    
    let thumbnail = '';
    const mediaContent = itemXml.match(/<media:content[^>]*url=\"([^\"]*)\"/)?.[1];
    const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]*url=\"([^\"]*)\"/)?.[1];
    const enclosure = itemXml.match(/<enclosure[^>]*url=\"([^\"]*)\"[^>]*type=\"image/)?.[1];
    const ogImage = itemXml.match(/<og:image>(.*?)<\/og:image>/)?.[1];

    const content = itemXml.match(/<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/)?.[1] || description;
    const imgInContent = content.match(/<img[^>]*src=\"([^\"]*)\"/)?.[1];

    thumbnail = mediaContent || mediaThumbnail || enclosure || ogImage || imgInContent || '';

    if (title && link && thumbnail) {
      items.push({
        title: stripHtml(title.trim()),
        description: stripHtml(description),
        link: link.trim(),
        pubDate,
        thumbnail: thumbnail,
        content: stripHtml(content),
      });
    }
  }

  return items;
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '\"',
    '&#39;': "'",
    '&#8216;': "'",
    '&#8217;': "'",
    '&#8220;': '\"',
    '&#8221;': '\"',
    '&#8211;': '-',
    '&#8212;': '-',
    '&#8230;': '...',
    '&apos;': "'",
    '&ldquo;': '\"',
    '&rdquo;': '\"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&mdash;': '-',
    '&ndash;': '-',
    '&hellip;': '...',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 10));
  });

  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });

  return decoded;
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<[^>]*>/g, '')
      .trim()
  );
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function fetchFullArticleContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) return '';

    const html = await response.text();

    let content = '';

    const articleSelectors = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class=\"[^\"]*article-content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*post-content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*entry-content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];

    for (const selector of articleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        content = match[1];
        break;
      }
    }

    if (!content) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      }
    }

    content = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*comment[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*sidebar[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*ad[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '');

    const images: string[] = [];
    const imageMatches = content.matchAll(/<img[^>]*src=\"([^\"]*)\"[^>]*>/gi);
    for (const match of imageMatches) {
      const imgSrc = match[1];
      if (imgSrc && !imgSrc.includes('data:image') && !imgSrc.includes('placeholder') && !imgSrc.includes('avatar') && !imgSrc.includes('icon')) {
        let fullUrl = imgSrc;
        if (imgSrc.startsWith('/')) {
          const urlObj = new URL(url);
          fullUrl = `${urlObj.protocol}//${urlObj.host}${imgSrc}`;
        }
        images.push(fullUrl);
      }
    }

    const paragraphs = content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    const textParts: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const cleaned = stripHtml(paragraphs[i]);
      if (cleaned.length > 50) {
        textParts.push(cleaned);

        if (images.length > 0 && i > 0 && i % 3 === 0 && images[Math.floor(i / 3) - 1]) {
          textParts.push(`[IMAGE:${images[Math.floor(i / 3) - 1]}]`);
        }
      }
    }

    return textParts.join('\n\n');
  } catch (error) {
    console.error('Error fetching full article:', error);
    return '';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sources } = await supabase
      .from('news_sources')
      .select('*')
      .eq('is_active', true);

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active news sources found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    let totalFetched = 0;
    let totalAdded = 0;
    const results = [];

    for (const source of sources) {
      const logEntry = {
        source_id: source.id,
        fetch_started_at: new Date().toISOString(),
        status: 'pending',
      };

      try {
        const response = await fetch(source.feed_url);
        const xmlText = await response.text();
        const items = parseRSS(xmlText);

        totalFetched += items.length;
        let addedCount = 0;

        const { data: categories } = await supabase
          .from('categories')
          .select('*');

        const { data: authors } = await supabase
          .from('authors')
          .select('*')
          .limit(1);

        const defaultAuthor = authors?.[0];
        const categoryMap = source.category_mapping as Record<string, string>;
        const defaultCategorySlug = categoryMap?.default || 'entertainment';
        const defaultCategory = categories?.find((c: any) => c.slug === defaultCategorySlug);

        const getAuthorByCategory = (categorySlug: string) => {
          return defaultAuthor;
        };

        for (const item of items.slice(0, 10)) {
          const slug = generateSlug(item.title);

          const { data: existing } = await supabase
            .from('media_content')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

          if (!existing) {
            let fullContent = item.content;

            if (item.link) {
              const scrapedContent = await fetchFullArticleContent(item.link);
              if (scrapedContent && scrapedContent.length > fullContent.length) {
                fullContent = scrapedContent;
              }
            }

            const assignedAuthor = getAuthorByCategory(defaultCategorySlug);

            const { error } = await supabase.from('media_content').insert({
              title: item.title,
              slug,
              description: item.description,
              content: fullContent,
              category_id: defaultCategory?.id,
              author_id: assignedAuthor?.id,
              media_type: 'article',
              thumbnail_url: item.thumbnail,
              external_url: item.link,
              source_id: source.id,
              source_published_at: item.pubDate,
              published_at: new Date().toISOString(),
              is_featured: false,
              is_trending: false,
              views_count: 0,
            });

            if (!error) {
              addedCount++;
              totalAdded++;
            }
          }
        }

        await supabase.from('news_sources').update({
          last_fetched_at: new Date().toISOString(),
        }).eq('id', source.id);

        await supabase.from('news_fetch_log').insert({
          source_id: source.id,
          fetch_started_at: logEntry.fetch_started_at,
          fetch_completed_at: new Date().toISOString(),
          items_fetched: items.length,
          items_added: addedCount,
          status: 'success',
        });

        results.push({
          source: source.name,
          fetched: items.length,
          added: addedCount,
        });
      } catch (error) {
        await supabase.from('news_fetch_log').insert({
          source_id: source.id,
          fetch_started_at: logEntry.fetch_started_at,
          fetch_completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });

        results.push({
          source: source.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${sources.length} sources`,
        totalFetched,
        totalAdded,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});