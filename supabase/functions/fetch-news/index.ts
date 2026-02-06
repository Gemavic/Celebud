import { createClient } from 'npm:@supabase/supabase-js@2';
import { parse as parseHTML } from 'npm:node-html-parser@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const categoryFallbackImages: Record<string, string[]> = {
  'immigration': [
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
    'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&q=80',
    'https://images.unsplash.com/photo-1569098644584-210bcd375b59?w=1200&q=80',
    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80',
  ],
  'politics': [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=80',
    'https://images.unsplash.com/photo-1551135049-8a33b5883817?w=1200&q=80',
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80',
    'https://images.unsplash.com/photo-1555374018-13a8994ab246?w=1200&q=80',
  ],
  'business': [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80',
  ],
  'finance': [
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=80',
  ],
  'technology': [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  ],
  'entertainment': [
    'https://images.unsplash.com/photo-1574267432644-f610f5ac2b0f?w=1200&q=80',
    'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1200&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&q=80',
    'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=1200&q=80',
  ],
  'celebrity': [
    'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1200&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80',
    'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1200&q=80',
  ],
  'lifestyle': [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80',
    'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=1200&q=80',
    'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200&q=80',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
  ],
  'education': [
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80',
    'https://images.unsplash.com/photo-1519406596751-0a3ccc4937fe?w=1200&q=80',
  ],
  'travel': [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1200&q=80',
  ],
  'society': [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
    'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&q=80',
    'https://images.unsplash.com/photo-1528605105345-5344ea20e269?w=1200&q=80',
  ],
  'news': [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80',
    'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1200&q=80',
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80',
  ],
};

function getCategoryFallbackImage(category: string): string {
  const images = categoryFallbackImages[category] || categoryFallbackImages['news'];
  return images[Math.floor(Math.random() * images.length)];
}

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
        thumbnail: thumbnail || '',
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

function calculatePriorityScore(title: string, description: string): { score: number; isTrending: boolean; isFeatured: boolean } {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  const highPriority = ['breaking', 'exclusive', 'urgent', 'just in', 'developing', 'alert', 'confirmed'];
  const mediumPriority = ['investigation', 'revealed', 'crisis', 'scandal', 'landmark', 'historic', 'unprecedented', 'shocking', 'massive'];
  const engagementSignals = ['killed', 'dead', 'arrested', 'election', 'president', 'minister', 'governor', 'attack', 'explosion', 'protest', 'strike', 'war', 'crash', 'disaster'];

  for (const keyword of highPriority) {
    if (text.includes(keyword)) score += 30;
  }
  for (const keyword of mediumPriority) {
    if (text.includes(keyword)) score += 15;
  }
  for (const keyword of engagementSignals) {
    if (text.includes(keyword)) score += 10;
  }

  return {
    score,
    isTrending: score >= 20,
    isFeatured: score >= 40,
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
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

const junkParagraphPatterns = [
  /^(share|tweet|comment|subscribe|follow|read more|latest|related)/i,
  /view\s+(image|photo|picture)\s+in\s+fullscreen/i,
  /photograph(er)?:/i,
  /image\s+credit:/i,
  /photo\s+(by|credit|courtesy)/i,
  /getty\s+images/i,
  /^(published|updated|posted)\s+(on|at|:)/i,
  /^related\s+(stories|articles|posts)/i,
  /^(sign\s+up|log\s+in|register)/i,
  /^(facebook|twitter|instagram|linkedin|whatsapp)/i,
  /^share\s+(this|on|via)/i,
  /^source:/i,
  /^\d+\s+(week|day|hour|minute)s?\s+ago$/i,
  /^tags?:/i,
  /join.*whatsapp/i,
  /all rights reserved/i,
  /written permission/i,
  /^save this story/i,
  /casino utan/i,
  /delivered straight to your phone/i,
  /do you employ househelps/i,
];

function isJunkParagraph(text: string): boolean {
  return junkParagraphPatterns.some(p => p.test(text));
}

async function fetchFullArticleContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
          const paragraphs = el.querySelectorAll('p');
          const totalText = paragraphs.map(p => p.text.trim()).filter(t => t.length > 30).join(' ');
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
      const imgs = source.querySelectorAll('img');
      for (const img of imgs) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (src && !src.includes('data:image') && !src.includes('base64') && isValidArticleImage(src)) {
          images.push(resolveImageUrl(src, url));
        }
      }
    } catch { /* skip */ }

    const paragraphs = source.querySelectorAll('p');
    const textParts: string[] = [];
    let imgIdx = 0;

    for (const p of paragraphs) {
      const text = p.text.trim();
      if (text.length >= 30 && !isJunkParagraph(text)) {
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
        if (cleaned.length > 40 && !isJunkParagraph(cleaned)) {
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
          .select('*');

        const gbengaAyandare = authors?.find((a: any) => a.name === 'Gbenga Ayandare');
        const victoriaOdunola = authors?.find((a: any) => a.name === 'Victoria Odunola');
        const defaultAuthor = victoriaOdunola || authors?.[0];
        const nigerianAuthors = [gbengaAyandare, victoriaOdunola].filter(Boolean);

        let nigerianArticleIndex = 0;
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

            let finalThumbnail = item.thumbnail;
            if (!finalThumbnail || finalThumbnail === '') {
              finalThumbnail = getCategoryFallbackImage(finalCategorySlug);
            }

            const priority = calculatePriorityScore(item.title, item.description);

            const { error } = await supabase.from('media_content').insert({
              title: item.title,
              slug,
              description: item.description,
              content: fullContent,
              category_id: articleCategory?.id,
              author_id: source.country === 'Nigeria' && nigerianAuthors.length > 0
                ? nigerianAuthors[nigerianArticleIndex++ % nigerianAuthors.length]?.id
                : defaultAuthor?.id,
              media_type: 'article',
              thumbnail_url: finalThumbnail,
              external_url: item.link,
              source_id: source.id,
              source_published_at: item.pubDate,
              published_at: new Date().toISOString(),
              is_featured: priority.isFeatured,
              is_trending: priority.isTrending,
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