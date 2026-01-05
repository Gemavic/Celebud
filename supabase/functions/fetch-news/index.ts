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

function isValidArticleImage(imageUrl: string): boolean {
  const lowerUrl = imageUrl.toLowerCase();

  const excludeKeywords = [
    'logo', 'icon', 'avatar', 'channel', 'header', 'footer',
    'banner', 'badge', 'button', 'social', 'share', 'favicon',
    'sprite', 'ui', 'nav', 'menu', 'sidebar', 'widget',
    'ad', 'advertisement', 'sponsor', 'promo',
    '/wp-content/themes/', '/assets/images/logo', '/static/logo',
    'gravatar', 'profile-pic', 'user-image', 'author-',
    'blank.', 'placeholder.', 'default.', 'dummy.',
    'spacer.', 'pixel.', 'trans.', 'invisible.'
  ];

  for (const keyword of excludeKeywords) {
    if (lowerUrl.includes(keyword)) {
      return false;
    }
  }

  const minSizePattern = /(\d+)x(\d+)/;
  const sizeMatch = imageUrl.match(minSizePattern);
  if (sizeMatch) {
    const width = parseInt(sizeMatch[1]);
    const height = parseInt(sizeMatch[2]);
    if (width < 200 || height < 200) {
      return false;
    }
  }

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasValidExtension = validExtensions.some(ext => lowerUrl.includes(ext));
  if (!hasValidExtension && !lowerUrl.includes('image')) {
    return false;
  }

  return true;
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
    const mediaContent = itemXml.match(/<media:content[^>]*url=\"([^\"]*)\"/)?.[ 1];
    const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]*url=\"([^\"]*)\"/)?.[ 1];
    const enclosure = itemXml.match(/<enclosure[^>]*url=\"([^\"]*)\"[^>]*type=\"image/)?.[1];
    const ogImage = itemXml.match(/<og:image>(.*?)<\/og:image>/)?.[1];

    const content = itemXml.match(/<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/)?.[1] || description;
    const imgInContent = content.match(/<img[^>]*src=\"([^\"]*)\"/)?.[ 1];

    const potentialThumbnails = [mediaContent, mediaThumbnail, enclosure, ogImage, imgInContent].filter(Boolean);

    for (const img of potentialThumbnails) {
      if (img && isValidArticleImage(img)) {
        thumbnail = img;
        break;
      }
    }

    if (title && link) {
      items.push({
        title: stripHtml(title.trim()),
        description: stripHtml(description),
        link: link.trim(),
        pubDate,
        thumbnail: thumbnail || 'https://images.pexels.com/photos/1148820/pexels-photo-1148820.jpeg',
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

function categorizeArticle(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    'immigration': ['immigration', 'visa', 'immigrant', 'citizenship', 'refugee', 'border', 'deportation', 'asylum', 'green card', 'permanent resident'],
    'politics': ['election', 'government', 'congress', 'senate', 'president', 'minister', 'political', 'parliament', 'vote', 'campaign', 'policy', 'legislation'],
    'business': ['business', 'company', 'corporate', 'economy', 'market', 'stock', 'trade', 'industry', 'commerce', 'startup', 'ceo', 'investor'],
    'finance': ['finance', 'investment', 'banking', 'financial', 'money', 'currency', 'cryptocurrency', 'bitcoin', 'stock market', 'trading', 'portfolio'],
    'technology': ['technology', 'tech', 'software', 'hardware', 'ai', 'artificial intelligence', 'app', 'digital', 'innovation', 'gadget', 'smartphone', 'computer'],
    'entertainment': ['entertainment', 'movie', 'film', 'music', 'celebrity', 'actor', 'actress', 'hollywood', 'netflix', 'streaming', 'concert', 'album'],
    'celebrity': ['celebrity', 'star', 'famous', 'kardashian', 'kanye', 'beyonce', 'taylor swift', 'drake', 'rihanna', 'bieber'],
    'lifestyle': ['lifestyle', 'fashion', 'beauty', 'wellness', 'health', 'fitness', 'food', 'recipe', 'home', 'decor', 'style'],
    'education': ['education', 'school', 'university', 'college', 'student', 'teacher', 'learning', 'academic', 'scholarship', 'degree'],
    'travel': ['travel', 'tourism', 'vacation', 'trip', 'destination', 'hotel', 'flight', 'adventure', 'tour', 'tourist'],
    'society': ['society', 'social', 'community', 'culture', 'religion', 'protest', 'movement', 'justice', 'equality', 'rights']
  };

  let bestMatch = 'news';
  let maxScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += keyword.split(' ').length;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) return '';

    const html = await response.text();

    let content = '';

    const articleSelectors = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class=\"[^\"]*article[_-]?body[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*article[_-]?content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*post[_-]?content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*entry[_-]?content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*story[_-]?body[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*story[_-]?content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=\"[^\"]*article[_-]?body[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=\"[^\"]*article[_-]?content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=\"[^\"]*story[_-]?body[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*td-post-content[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=\"[^\"]*content-body[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i,
      /<section[^>]*class=\"[^\"]*article[^\"]*\"[^>]*>([\s\S]*?)<\/section>/i,
      /<main[^>]*class=\"[^\"]*article[^\"]*\"[^>]*>([\s\S]*?)<\/main>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];

    for (const selector of articleSelectors) {
      const match = html.match(selector);
      if (match && match[1]) {
        const potentialContent = match[1];
        const textLength = stripHtml(potentialContent).length;
        if (textLength > 500) {
          content = potentialContent;
          break;
        }
      }
    }

    if (!content) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      }
    }

    if (!content) return '';

    content = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*comment[s]?[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*sidebar[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*widget[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*ad[s]?[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*banner[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*social[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*share[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=\"[^\"]*newsletter[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*id=\"[^\"]*comment[s]?[^\"]*\"[^>]*>[\s\S]*?<\/div>/gi, '');

    const images: string[] = [];
    const imageMatches = content.matchAll(/<img[^>]*src=[\"']([^\"']*)[\"'][^>]*>/gi);
    for (const match of imageMatches) {
      const imgSrc = match[1];
      if (imgSrc && !imgSrc.includes('data:image') && !imgSrc.includes('base64')) {
        let fullUrl = imgSrc;
        try {
          if (imgSrc.startsWith('//')) {
            fullUrl = `https:${imgSrc}`;
          } else if (imgSrc.startsWith('/')) {
            const urlObj = new URL(url);
            fullUrl = `${urlObj.protocol}//${urlObj.host}${imgSrc}`;
          } else if (!imgSrc.startsWith('http')) {
            const urlObj = new URL(url);
            const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
            fullUrl = `${urlObj.protocol}//${urlObj.host}${basePath}${imgSrc}`;
          }
          if (isValidArticleImage(fullUrl)) {
            images.push(fullUrl);
          }
        } catch (e) {
        }
      }
    }

    const contentElements = [
      ...Array.from(content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map(m => ({ type: 'p', content: m[1] })),
      ...Array.from(content.matchAll(/<div[^>]*class=\"[^\"]*paragraph[^\"]*\"[^>]*>([\s\S]*?)<\/div>/gi)).map(m => ({ type: 'div', content: m[1] })),
      ...Array.from(content.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)).map(m => ({ type: 'h', content: m[1] })),
      ...Array.from(content.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi)).map(m => ({ type: 'quote', content: m[1] })),
      ...Array.from(content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map(m => ({ type: 'li', content: m[1] })),
    ];

    const textParts: string[] = [];
    let imageInsertCount = 0;

    for (let i = 0; i < contentElements.length; i++) {
      const element = contentElements[i];
      const cleaned = stripHtml(element.content).trim();

      const minLength = element.type === 'h' ? 5 : element.type === 'li' ? 10 : 40;

      if (cleaned.length >= minLength && !cleaned.match(/^(share|tweet|comment|subscribe|follow|read more)/i)) {
        textParts.push(cleaned);

        if (images.length > imageInsertCount && textParts.length > 2 && textParts.length % 4 === 0) {
          textParts.push(`[IMAGE:${images[imageInsertCount]}]`);
          imageInsertCount++;
        }
      }
    }

    if (textParts.length === 0) {
      const allText = stripHtml(content);
      const sentences = allText.match(/[^.!?]+[.!?]+/g) || [];
      for (const sentence of sentences) {
        const cleaned = sentence.trim();
        if (cleaned.length > 50) {
          textParts.push(cleaned);
        }
      }
    }

    const finalContent = textParts.join('\n\n');

    return finalContent.length > 200 ? finalContent : '';
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

    const sourcesByCountry = {
      'Nigeria': sources.filter((s: any) => s.country === 'Nigeria'),
      'Canada': sources.filter((s: any) => s.country === 'Canada'),
      'USA': sources.filter((s: any) => s.country === 'USA'),
      'Global': sources.filter((s: any) => s.country === 'Global' || !s.country),
    };

    const totalArticlesTarget = 100;
    const articlesPerCountry = {
      'Nigeria': Math.floor(totalArticlesTarget * 0.50),
      'Canada': Math.floor(totalArticlesTarget * 0.20),
      'USA': Math.floor(totalArticlesTarget * 0.10),
      'Global': Math.floor(totalArticlesTarget * 0.30),
    };

    let totalFetched = 0;
    let totalAdded = 0;
    const results = [];

    for (const [country, countrySources] of Object.entries(sourcesByCountry)) {
      if (countrySources.length === 0) continue;

      const targetArticles = articlesPerCountry[country as keyof typeof articlesPerCountry];
      const articlesPerSource = Math.ceil(targetArticles / countrySources.length);

      for (const source of countrySources) {
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
        const sourceCategorySlug = categoryMap?.default || 'news';

        for (const item of items.slice(0, articlesPerSource)) {
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

            const detectedCategorySlug = categorizeArticle(item.title, item.description);
            const finalCategorySlug = detectedCategorySlug !== 'news' ? detectedCategorySlug : sourceCategorySlug;
            const articleCategory = categories?.find((c: any) => c.slug === finalCategorySlug);

            const { error } = await supabase.from('media_content').insert({
              title: item.title,
              slug,
              description: item.description,
              content: fullContent,
              category_id: articleCategory?.id,
              author_id: defaultAuthor?.id,
              media_type: 'article',
              thumbnail_url: item.thumbnail,
              external_url: item.link,
              source_id: source.id,
              source_published_at: item.pubDate,
              published_at: new Date().toISOString(),
              is_featured: false,
              is_trending: false,
              views_count: 0,
              comments_count: 0,
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
          country: country,
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
          country: country,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${sources.length} sources with weighted distribution`,
        distribution: articlesPerCountry,
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