import { createClient } from 'npm:@supabase/supabase-js@2';
import { parse as parseHTML } from 'npm:node-html-parser@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const fifaWorldCupKeywords = [
  'world cup', 'fifa', 'worldcup', 'qatar 2022', 'usa 2026', 'mexico 2026', 'canada 2026',
  'world cup 2026', 'fifa world cup', 'group stage', 'round of 16', 'quarter-final',
  'quarterfinal', 'semi-final', 'semifinal', 'world cup final', 'world cup qualifier',
  'fifa ranking', 'ballon d\'or', 'golden boot', 'copa america', 'euro 2024', 'afcon',
  'champions league', 'europa league', 'ucl', 'premier league', 'la liga', 'bundesliga',
  'serie a', 'ligue 1', 'super eagles', 'three lions', 'les bleus',
];

const fifaWorldCupThumbnails = [
  'https://digitalhub.fifa.com/transform/3603e5f0-14e8-4cd4-8a9e-273b3e7b4a58/FIFA-World-Cup-26-Official-Brand',
  'https://digitalhub.fifa.com/transform/6a9e54e5-f498-4059-aa83-b3190f93f20f/FIFA+WC+2026+Brand+Key+Visual',
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=1200&q=80',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80',
];

function isWorldCupContent(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase();
  return fifaWorldCupKeywords.some(kw => text.includes(kw));
}

function getWorldCupThumbnail(): string {
  return fifaWorldCupThumbnails[Math.floor(Math.random() * fifaWorldCupThumbnails.length)];
}

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
  'security': [
    'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=1200&q=80',
    'https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=1200&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
  ],
  'sports': [
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
    'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=1200&q=80',
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80',
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80',
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80',
    'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&q=80',
  ],
  'health': [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1200&q=80',
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80',
  ],
  'legal': [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80',
    'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=80',
    'https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?w=1200&q=80',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
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
    'advertisement', 'sponsor', 'promo',
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
  if (!hasValidExtension && !lowerUrl.includes('image') && !lowerUrl.includes('photo') && !lowerUrl.includes('img') && !lowerUrl.includes('resize')) {
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
    const description = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/)?.[1] || itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/)?.[2] || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();

    let thumbnail = '';
    const mediaContent = itemXml.match(/<media:content[^>]*url="([^"]*)"/)?.[ 1];
    const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]*url="([^"]*)"/)?.[ 1];
    const enclosure = itemXml.match(/<enclosure[^>]*url="([^"]*)"[^>]*type="image/)?.[ 1];
    const ogImage = itemXml.match(/<og:image>(.*?)<\/og:image>/)?.[1];

    const content = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] || description;
    const imgInContent = content.match(/<img[^>]*src="([^"]*)"/)?.[ 1];

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
    '&quot;': '"',
    '&#39;': "'",
    '&#8216;': "'",
    '&#8217;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '-',
    '&#8212;': '-',
    '&#8230;': '...',
    '&apos;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
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
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function wordMatch(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

function phraseMatchCount(text: string, phrases: string[]): number {
  let count = 0;
  for (const phrase of phrases) {
    if (wordMatch(text, phrase)) {
      count += phrase.split(/\s+/).length;
    }
  }
  return count;
}

function categorizeArticle(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  const categoryKeywords: Record<string, { primary: string[]; secondary: string[] }> = {
    'security': {
      primary: [
        'killing', 'killed', 'murder', 'murdered', 'terrorism', 'terrorist',
        'attack on', 'bomb', 'bombing', 'explosion', 'gunmen', 'gunman',
        'kidnap', 'kidnapped', 'kidnapping', 'abducted', 'abduction',
        'bandit', 'bandits', 'insurgent', 'insurgents', 'insurgency',
        'militant', 'militants', 'massacre', 'lynch', 'lynched', 'lynching',
        'assassination', 'assassinated', 'armed robbery', 'robbery',
        'homicide', 'manslaughter', 'shooting', 'stabbing', 'arson',
        'crisis', 'survivors', 'casualties', 'death toll',
        'boko haram', 'iswap', 'al-qaeda', 'isis',
        'hostage', 'ambush', 'raid', 'siege', 'extremist',
        'cartel', 'gang violence', 'hate crime', 'mass shooting',
      ],
      secondary: [
        'police', 'arrested', 'arrest', 'suspect', 'crime', 'criminal',
        'security forces', 'military operation', 'troops',
        'violence', 'violent', 'threat', 'dangerous',
        'contraband', 'smuggling', 'trafficking',
        'investigation', 'detective', 'law enforcement',
      ],
    },
    'legal': {
      primary: [
        'court orders', 'court ruling', 'court rules', 'court case',
        'lawsuit', 'litigation', 'tribunal', 'judicial',
        'verdict', 'sentenced', 'sentencing', 'conviction', 'convicted',
        'indicted', 'indictment', 'arraigned', 'arraignment',
        'prosecutor', 'prosecution', 'defendant', 'plaintiff',
        'supreme court', 'high court', 'appeal court', 'magistrate',
        'legal battle', 'legal action', 'legal proceedings',
        'fined', 'penalty', 'bail', 'parole',
      ],
      secondary: [
        'judge', 'lawyer', 'attorney', 'barrister', 'solicitor',
        'jurisdiction', 'statute', 'legislation', 'regulatory',
        'compliance', 'injunction', 'restraining order',
        'status quo', 'habeas corpus',
      ],
    },
    'sports': {
      primary: [
        'olympic', 'olympics', 'world cup', 'championship', 'tournament',
        'football', 'soccer', 'basketball', 'baseball', 'hockey',
        'tennis', 'cricket', 'rugby', 'boxing', 'wrestling',
        'marathon', 'athlete', 'athletes', 'medal', 'medals',
        'premier league', 'champions league', 'la liga', 'serie a',
        'nba', 'nfl', 'nhl', 'mlb', 'mls', 'fifa',
        'goalkeeper', 'striker', 'midfielder', 'defender',
        'coach', 'playoff', 'playoffs', 'semifinal', 'quarterfinal',
        'blue jays', 'raptors', 'maple leafs', 'canadiens',
        'winnipeg jets', 'calgary flames', 'edmonton oilers',
        'toronto fc', 'vancouver whitecaps',
      ],
      secondary: [
        'game', 'match', 'score', 'win', 'loss', 'defeat',
        'season', 'league', 'team', 'player', 'roster',
        'stadium', 'arena', 'spectator', 'fan', 'fans',
        'rivalry', 'derby', 'fixture',
      ],
    },
    'health': {
      primary: [
        'cancer', 'disease', 'diagnosis', 'treatment', 'therapy',
        'hospital', 'hospitalised', 'hospitalized', 'surgery', 'surgeon',
        'pandemic', 'epidemic', 'outbreak', 'vaccine', 'vaccination',
        'mental health', 'depression', 'anxiety', 'disorder',
        'medical', 'medicine', 'pharmaceutical', 'drug trial',
        'patient', 'patients', 'clinical trial', 'clinical',
        'public health', 'who', 'cdc',
        'birth', 'pregnancy', 'maternal', 'fertility',
      ],
      secondary: [
        'doctor', 'nurse', 'physician', 'healthcare',
        'symptom', 'symptoms', 'chronic', 'acute',
        'wellness', 'nutrition', 'diet',
      ],
    },
    'immigration': {
      primary: [
        'immigration', 'immigrant', 'immigrants', 'visa', 'visas',
        'citizenship', 'refugee', 'refugees', 'deportation', 'deported',
        'asylum', 'green card', 'permanent resident', 'permanent residency',
        'work permit', 'study permit', 'border control',
        'immigration policy', 'immigration reform',
        'undocumented', 'migrant', 'migrants', 'migration',
      ],
      secondary: [
        'border', 'customs', 'passport', 'diaspora', 'expatriate',
        'resettlement', 'naturalization',
      ],
    },
    'politics': {
      primary: [
        'election', 'elections', 'government', 'congress', 'senate',
        'president', 'prime minister', 'minister', 'parliament',
        'vote', 'voting', 'campaign', 'legislation', 'bill passed',
        'governor', 'senator', 'representative', 'lawmaker',
        'political party', 'opposition', 'ruling party',
        'geopolitical', 'diplomacy', 'diplomatic', 'embassy',
        'consulate', 'foreign affairs', 'foreign policy',
        'sanctions', 'tariff', 'tariffs', 'trade deal',
        'executive order', 'white house', 'capitol',
        'inec', 'area council', 'polls',
        'cabinet', 'minister appointment', 'ministerial',
        'federal government', 'state government', 'local government',
        'ballot', 'referendum', 'impeachment', 'veto',
        'treaty', 'summit', 'bilateral', 'multilateral',
        'nato', 'united nations', 'european union',
        'democracy', 'dictatorship', 'authoritarian',
      ],
      secondary: [
        'political', 'policy', 'partisan', 'bipartisan',
        'debate', 'caucus', 'lobby', 'lobbying',
        'constituent', 'constituency', 'mandate',
        'administration', 'regime', 'coalition',
      ],
    },
    'business': {
      primary: [
        'company', 'corporate', 'corporation', 'merger', 'acquisition',
        'startup', 'entrepreneur', 'ceo', 'revenue', 'profit',
        'quarterly earnings', 'annual report', 'ipo',
        'factory', 'manufacturing', 'production', 'supply chain',
        'retail', 'wholesale', 'commerce', 'e-commerce',
        'unemployment', 'jobs report', 'employment rate',
        'gdp', 'economic growth', 'recession', 'inflation',
        'interest rate', 'central bank',
        'stellantis', 'amazon', 'tesla', 'apple', 'google', 'microsoft',
        'layoffs', 'hiring', 'workforce', 'bankruptcy',
        'partnership', 'joint venture', 'acquisition deal',
        'board of directors', 'shareholders', 'stakeholders',
        'product launch', 'market share', 'competition',
        'sales figures', 'earnings report', 'fiscal year',
      ],
      secondary: [
        'business', 'economy', 'market', 'industry', 'trade',
        'investor', 'investment', 'stock', 'shares',
        'consumer', 'demand', 'growth',
        'commercial', 'enterprise', 'venture',
      ],
    },
    'finance': {
      primary: [
        'stock market', 'wall street', 'nasdaq', 'dow jones', 's&p 500',
        'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain',
        'banking', 'bank of', 'central bank', 'federal reserve',
        'portfolio', 'dividend', 'bond', 'bonds', 'treasury',
        'hedge fund', 'mutual fund', 'etf',
        'financial crisis', 'market crash', 'bubble',
        'savings', 'retirement', 'pension', '401k',
        'forex', 'currency', 'exchange rate',
      ],
      secondary: [
        'finance', 'financial', 'investment', 'trading',
        'money', 'wealth', 'asset', 'assets',
        'insurer', 'insurance',
      ],
    },
    'technology': {
      primary: [
        'artificial intelligence', 'machine learning', 'deep learning',
        'software', 'hardware', 'semiconductor', 'chip',
        'smartphone', 'iphone', 'android', 'gadget', 'gadgets',
        'cybersecurity', 'data breach', 'hacking', 'ransomware',
        'cloud computing', 'saas', 'api', 'algorithm',
        'robotics', 'robot', 'automation', 'autonomous',
        'virtual reality', 'augmented reality', 'metaverse',
        'startup tech', '5g', 'broadband', 'internet',
        'silicon valley', 'big tech',
        'spotify', 'tiktok', 'netflix', 'streaming service',
        'charging station', 'wireless charger',
        'garmin', 'wearable', 'smartwatch',
      ],
      secondary: [
        'technology', 'tech company', 'innovation', 'digital transformation',
        'computer', 'computing', 'processor', 'server',
        'programming', 'developer', 'engineering',
      ],
    },
    'entertainment': {
      primary: [
        'movie', 'movies', 'film', 'films', 'cinema', 'box office',
        'album', 'albums', 'concert', 'concerts', 'tour',
        'hollywood', 'nollywood', 'bollywood',
        'streaming', 'tv show', 'tv series', 'television',
        'grammy', 'grammys', 'oscar', 'oscars', 'emmy', 'emmys',
        'actor', 'actress', 'director', 'producer',
        'music video', 'single release', 'album release',
        'heated rivalry', 'casting', 'audition',
        'premiere', 'red carpet', 'film festival', 'sundance',
        'cannes', 'venice', 'toronto', 'tiff',
        'screenwriter', 'screenplay', 'cinematographer',
        'rapper', 'singer', 'musician', 'band',
        'soundtrack', 'soundtrack album', 'music industry',
        'record label', 'music producer', 'artist release',
      ],
      secondary: [
        'entertainment', 'showbiz', 'celebrity', 'star',
        'performance', 'performer', 'artist',
        'comedy', 'drama', 'thriller', 'documentary',
        'scene', 'episode', 'season', 'series finale',
        'ratings', 'viewership', 'audience',
      ],
    },
    'celebrity': {
      primary: [
        'kardashian', 'kanye', 'beyonce', 'taylor swift', 'drake',
        'rihanna', 'bieber', 'selena gomez', 'doja cat',
        'davido', 'wizkid', 'burna boy', 'tiwa savage',
        'red carpet', 'paparazzi', 'scandal',
      ],
      secondary: [
        'celebrity', 'famous', 'star-studded', 'a-list',
        'gossip', 'rumor', 'dating',
      ],
    },
    'lifestyle': {
      primary: [
        'fashion', 'beauty', 'fitness', 'workout', 'exercise',
        'recipe', 'recipes', 'cooking', 'cuisine',
        'home decor', 'interior design', 'renovation',
        'skincare', 'makeup', 'cosmetics',
        'self-care', 'mindfulness', 'meditation', 'yoga',
        'parenting', 'family life', 'relationship',
      ],
      secondary: [
        'lifestyle', 'wellness', 'style', 'trend', 'trendy',
        'home', 'living', 'modern living',
      ],
    },
    'education': {
      primary: [
        'university', 'college', 'school', 'scholarship', 'scholarships',
        'academic', 'professor', 'lecturer', 'curriculum',
        'student', 'students', 'enrollment', 'admission',
        'graduation', 'degree', 'diploma', 'phd',
        'research', 'study finds', 'study shows',
        'jamb', 'waec', 'neco', 'utme',
      ],
      secondary: [
        'education', 'learning', 'teacher', 'teaching',
        'exam', 'examination', 'tuition', 'campus',
      ],
    },
    'travel': {
      primary: [
        'tourism', 'tourist', 'tourists', 'vacation', 'holiday',
        'destination', 'destinations', 'hotel', 'hotels', 'resort',
        'airline', 'airlines', 'flight', 'flights', 'airport',
        'cruise', 'backpacking', 'sightseeing',
        'travel adapter', 'travel gear', 'travel guide',
      ],
      secondary: [
        'travel', 'trip', 'journey', 'adventure', 'explore',
        'booking', 'itinerary', 'luggage',
      ],
    },
    'society': {
      primary: [
        'community', 'community development', 'social development',
        'cultural heritage', 'tradition', 'traditions',
        'charity', 'humanitarian', 'philanthropy',
        'gender equality', 'women rights', 'human rights',
        'racial justice', 'social justice', 'civil rights',
        'protest', 'demonstration', 'rally', 'march',
        'religious', 'mosque', 'church', 'temple',
        'empowerment', 'year of families',
        'discrimination', 'inequality', 'diversity',
        'inclusion', 'lgbtq', 'minority rights',
        'indigenous', 'tribal', 'ethnic groups',
        'volunteer', 'nonprofit', 'ngo',
        'social issues', 'social change', 'advocacy',
      ],
      secondary: [
        'society', 'social', 'culture', 'cultural',
        'movement', 'activism', 'activist',
        'equality', 'rights', 'justice',
        'grassroots', 'organization', 'initiative',
      ],
    },
  };

  let bestMatch = 'news';
  let maxScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    score += phraseMatchCount(text, keywords.primary) * 3;
    score += phraseMatchCount(text, keywords.secondary) * 1;

    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  }

  if (maxScore < 2) {
    return 'news';
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
    if (wordMatch(text, keyword)) score += 30;
  }
  for (const keyword of mediumPriority) {
    if (wordMatch(text, keyword)) score += 15;
  }
  for (const keyword of engagementSignals) {
    if (wordMatch(text, keyword)) score += 10;
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

const celebudReporters = [
  'Gbenga Ayandare',
  'Victoria Odunola',
  'Matthew Ayandare',
  'Princess Bola',
  'Amusa Babatunde',
];
const celebudWhatsApp = '+14377888011';

function sanitizeContactInfo(text: string): string {
  // Replace WhatsApp/phone number patterns with Celebud default
  const phonePatterns = [
    /(\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{0,4})/g,
    /(\+\d{10,15})/g,
    /(0\d{10,11})/g,
    /(\d{3}[-.\s]\d{3}[-.\s]\d{4})/g,
  ];

  // Patterns that indicate a contact section at end of article
  const contactBlockPattern = /(?:(?:whatsapp|call|text|contact|reach|send\s+(?:a\s+)?message|chat\s+(?:with\s+)?us?)[\s:]*(?:on|at|via|through|@)?[\s:]*)([\w\s.''-]+?)(?:\s*(?:on|at|via|:))?\s*(\+?\d[\d\s.()-]{7,})/gi;
  const nameBeforeNumberPattern = /(?:(?:by|from|contact|reporter|correspondent|editor|author|journalist|writer)[\s:]+)([\w\s.''-]{3,30})(?:\s*[-,;:]\s*|\s+)(\+?\d[\d\s.()-]{7,})/gi;
  const numberWithNamePattern = /(\+?\d[\d\s.()-]{7,})\s*[-–]\s*([\w\s.''-]{3,30})/gi;
  const standaloneWhatsApp = /(whatsapp|wa\.me|wa\s*:\s*)[\s/]*(\+?\d[\d\s.()-]{7,})/gi;

  let result = text;

  // Replace contact blocks with Celebud reporter info
  const reporter = celebudReporters[Math.floor(Math.random() * celebudReporters.length)];

  result = result.replace(contactBlockPattern, (match) => {
    return match.replace(/[\w\s.''-]+?(?:\s*(?:on|at|via|:))?\s*\+?\d[\d\s.()-]{7,}/i, `${reporter} on ${celebudWhatsApp}`);
  });

  result = result.replace(nameBeforeNumberPattern, () => {
    return `${reporter} - ${celebudWhatsApp}`;
  });

  result = result.replace(numberWithNamePattern, () => {
    return `${celebudWhatsApp} - ${reporter}`;
  });

  result = result.replace(standaloneWhatsApp, (_match, prefix) => {
    return `${prefix} ${celebudWhatsApp}`;
  });

  // Replace remaining standalone phone numbers near WhatsApp mentions
  const lines = result.split('\n');
  const cleanedLines = lines.map(line => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('whatsapp') || lowerLine.includes('wa.me') || lowerLine.includes('call') || lowerLine.includes('text us') || lowerLine.includes('contact')) {
      for (const pattern of phonePatterns) {
        line = line.replace(pattern, celebudWhatsApp);
      }
    }
    return line;
  });

  return cleanedLines.join('\n');
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
  /click here/i,
  /subscribe to/i,
  /newsletter/i,
  /download our app/i,
  /follow us on/i,
  /copyright/i,
  /^\s*advertisement\s*$/i,
  /^\s*sponsored\s*$/i,
  /read also/i,
  /see also/i,
  /you may also like/i,
  /recommended for you/i,
];

function isJunkParagraph(text: string): boolean {
  return junkParagraphPatterns.some(p => p.test(text));
}

async function fetchFullArticleContent(url: string): Promise<{ content: string; thumbnail: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

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
    if (!response.ok) return { content: '', thumbnail: '' };

    const html = await response.text();
    const root = parseHTML(html);

    let ogImage = '';
    const ogImageMeta = root.querySelector('meta[property="og:image"]');
    if (ogImageMeta) {
      ogImage = ogImageMeta.getAttribute('content') || '';
    }
    if (!ogImage) {
      const twitterImage = root.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        ogImage = twitterImage.getAttribute('content') || '';
      }
    }
    if (ogImage && !ogImage.startsWith('http')) {
      ogImage = resolveImageUrl(ogImage, url);
    }

    const junkSelectors = [
      'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer',
      'aside', 'form', 'figcaption', 'svg',
      '[class*="comment"]', '[class*="sidebar"]', '[class*="widget"]',
      '[class*="advert"]', '[class*="banner"]', '[class*="social"]',
      '[class*="share"]', '[class*="newsletter"]', '[class*="related"]',
      '[class*="author-bio"]', '[class*="byline"]', '[class*="credit"]',
      '[class*="breadcrumb"]', '[class*="pagination"]', '[class*="tag-list"]',
      '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
      '[class*="recommended"]', '[class*="also-read"]', '[class*="more-stories"]',
      '[id*="comment"]', '[id*="sidebar"]', '[id*="footer"]',
    ];
    for (const sel of junkSelectors) {
      try { root.querySelectorAll(sel).forEach(el => el.remove()); } catch { /* skip */ }
    }

    const containerSelectors = [
      '[itemprop="articleBody"]',
      'article .article-body', 'article .article-content',
      '.article-body', '.article-content', '.article_body', '.article_content',
      '.post-content', '.post_content', '.entry-content', '.entry_content',
      '.story-body', '.story-content', '.story_body', '.story_content',
      '.td-post-content', '.content-body', '.content_body',
      '.c-article-body', '.article__body', '.article__content',
      '#article-body', '#article-content', '#story-body',
      'article',
      '[role="article"]',
      'main .content', 'main',
      '.post', '.entry',
    ];

    let source = null;
    for (const sel of containerSelectors) {
      try {
        const el = root.querySelector(sel);
        if (el) {
          const paragraphs = el.querySelectorAll('p');
          const totalText = paragraphs.map(p => p.text.trim()).filter(t => t.length > 30).join(' ');
          if (totalText.length > 150) {
            source = el;
            break;
          }
        }
      } catch { /* skip */ }
    }

    if (!source) {
      const allParagraphs = root.querySelectorAll('p');
      const longParagraphs = allParagraphs.filter(p => p.text.trim().length > 50);
      if (longParagraphs.length >= 2) {
        source = root;
      }
    }

    if (!source) return { content: '', thumbnail: ogImage };

    const images: string[] = [];
    try {
      const imgs = source.querySelectorAll('img');
      for (const img of imgs) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
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
      if (text.length >= 25 && !isJunkParagraph(text)) {
        textParts.push(text);
        if (images[imgIdx] && textParts.length > 2 && textParts.length % 4 === 0) {
          textParts.push(`[IMAGE:${images[imgIdx]}]`);
          imgIdx++;
        }
      }
    }

    if (textParts.length < 3) {
      const divs = source.querySelectorAll('div');
      for (const div of divs) {
        const directText = div.text.trim();
        if (directText.length > 60 && !isJunkParagraph(directText)) {
          const sentences = directText.match(/[^.!?\n]+[.!?]+/g) || [];
          for (const sentence of sentences) {
            const cleaned = sentence.trim();
            if (cleaned.length > 35 && !isJunkParagraph(cleaned)) {
              textParts.push(cleaned);
            }
          }
          if (textParts.length >= 3) break;
        }
      }
    }

    if (textParts.length < 3) {
      const allText = source.text;
      const sentences = allText.match(/[^.!?\n]+[.!?]+/g) || [];
      for (const sentence of sentences) {
        const cleaned = sentence.trim();
        if (cleaned.length > 35 && !isJunkParagraph(cleaned)) {
          textParts.push(cleaned);
        }
      }
    }

    const seen = new Set<string>();
    const dedupedParts: string[] = [];
    for (const part of textParts) {
      const normalized = part.toLowerCase().trim().substring(0, 80);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        dedupedParts.push(part);
      }
    }

    const finalContent = sanitizeContactInfo(dedupedParts.join('\n\n'));
    return {
      content: finalContent.length > 80 ? finalContent : '',
      thumbnail: ogImage,
    };
  } catch {
    return { content: '', thumbnail: '' };
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

    // Articles are never auto-archived or auto-deleted by age here — they
    // stay live indefinitely until an admin/editor removes them from
    // Article Management. (This function used to sweep RSS-fetched
    // articles older than 7 days into media_content_archive on every run,
    // which silently dropped their accumulated view counts from the
    // site-wide total every time this function fired — removed.)

    // Priority order: Nigeria 15%, Canada 15%, USA 15%, UK 10%, Sports 10%, remaining 35% to Global/others
    const priorityCountries = ['Nigeria', 'Canada', 'USA', 'UK', 'Sports'];
    const priorityAllocations: Record<string, number> = {
      'Nigeria': 0.15,
      'Canada': 0.15,
      'USA': 0.15,
      'UK': 0.10,
      'Sports': 0.10,
    };

    const allCountries = [...new Set(sources.map((s: any) => s.country || 'Global'))];
    const otherCountries = allCountries.filter(c => !priorityCountries.includes(c));
    const remainingShare = 1 - Object.values(priorityAllocations).reduce((a, b) => a + b, 0);
    const perOtherCountry = otherCountries.length > 0 ? remainingShare / otherCountries.length : remainingShare;
    for (const c of otherCountries) {
      priorityAllocations[c] = perOtherCountry;
    }

    const sourcesByCountry: Record<string, any[]> = {};
    for (const source of sources) {
      const key = source.country || 'Global';
      if (!sourcesByCountry[key]) sourcesByCountry[key] = [];
      sourcesByCountry[key].push(source);
    }

    const totalArticlesTarget = 100;
    const articlesPerCountry: Record<string, number> = {};
    for (const [country, share] of Object.entries(priorityAllocations)) {
      articlesPerCountry[country] = Math.floor(totalArticlesTarget * share);
    }

    let totalFetched = 0;
    let totalAdded = 0;
    const results = [];
    const countryAddedCount: Record<string, number> = {};

    for (const [country, countrySources] of Object.entries(sourcesByCountry)) {
      if (countrySources.length === 0) continue;

      const targetArticles = articlesPerCountry[country as keyof typeof articlesPerCountry];
      const articlesPerSource = Math.ceil(targetArticles / countrySources.length);
      countryAddedCount[country] = 0;

      for (const source of countrySources) {
      if (countryAddedCount[country] >= targetArticles) break;
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
          .select('id, name');

        // Fetch routing rules from the database — single source of truth
        const { data: routingRules } = await supabase
          .from('author_routing_rules')
          .select('country_values, author_id, priority')
          .order('priority');

        const sourceCountry = (source.country || '').toLowerCase();

        // Victoria's category beats: entertainment, celebrity, lifestyle
        const victoriaAuthor = authors?.find((a: any) => a.name === 'Victoria Odunola');
        const victoriaCategorySlugs = ['entertainment', 'celebrity', 'lifestyle'];

        // Matthew's financial/insurance/business override for Canada (not USA)
        const matthewAuthor = authors?.find((a: any) => a.name === 'Matthew Ayandare');
        const financialCategorySlugs = ['business', 'finance-accounting', 'fin-advisor'];
        const financialKeywords = ['finance', 'financial', 'insurance', 'banking', 'mortgage', 'investment', 'economy', 'economic', 'stock market', 'tax', 'budget', 'fiscal'];

        function isFinancialContent(title: string, description: string): boolean {
          const text = (title + ' ' + description).toLowerCase();
          return financialKeywords.some(kw => text.includes(kw));
        }

        // Resolve author by matching source country against routing rules.
        // Also reports whether a SPECIFIC region matched (vs. falling
        // through to the Global/International catch-all) — a specific
        // match means a reporter's actual assigned coverage area, which
        // takes precedence over Victoria's entertainment/celebrity/
        // lifestyle override below, so each reporter gets full credit for
        // their region even when a given article happens to be
        // entertainment-flavored.
        function resolveAuthorByCountry(country: string): { author: any; specificMatch: boolean } {
          const lowerCountry = country.toLowerCase();
          if (!routingRules || routingRules.length === 0) return { author: authors?.[0], specificMatch: false };
          for (const rule of routingRules) {
            const matches = (rule.country_values as string[]).some(
              (cv: string) => cv.toLowerCase() === lowerCountry
            );
            if (matches) {
              return { author: authors?.find((a: any) => a.id === rule.author_id), specificMatch: true };
            }
          }
          // Fallback: last rule (Global / International) or first author
          const fallbackRule = routingRules[routingRules.length - 1];
          return { author: authors?.find((a: any) => a.id === fallbackRule?.author_id) || authors?.[0], specificMatch: false };
        }

        const { author: defaultAuthorForSource, specificMatch: sourceHasSpecificRegion } =
          resolveAuthorByCountry(source.country || 'Global');

        const categoryMap = source.category_mapping as Record<string, string>;
        const sourceCategorySlug = categoryMap?.default || 'news';

        for (const item of items.slice(0, articlesPerSource)) {
          const slug = generateSlug(item.title);

          // Check for duplicates by slug, title, or external_url
          const { data: existingBySlug } = await supabase
            .from('media_content')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

          if (existingBySlug) continue;

          const { data: existingByUrl } = item.link ? await supabase
            .from('media_content')
            .select('id')
            .eq('external_url', item.link)
            .maybeSingle() : { data: null };

          if (existingByUrl) continue;

          const { data: existingByTitle } = await supabase
            .from('media_content')
            .select('id')
            .eq('title', item.title)
            .maybeSingle();

          if (!existingByTitle) {
            let fullContent = item.content;
            let scrapedThumbnail = '';

            if (item.link) {
              const scraped = await fetchFullArticleContent(item.link);
              if (scraped.content && scraped.content.length > fullContent.length) {
                fullContent = scraped.content;
              }
              if (scraped.thumbnail && isValidArticleImage(scraped.thumbnail)) {
                scrapedThumbnail = scraped.thumbnail;
              }
            }

            const finalContent = stripHtml(sanitizeContactInfo(fullContent));
            const finalDescription = stripHtml(sanitizeContactInfo(item.description));

            if (!finalContent && !finalDescription) {
              continue;
            }

            const detectedCategorySlug = categorizeArticle(item.title, item.description + ' ' + fullContent.substring(0, 500));
            const finalCategorySlug = detectedCategorySlug !== 'news' ? detectedCategorySlug : sourceCategorySlug;
            const articleCategory = categories?.find((c: any) => c.slug === finalCategorySlug);

            let finalThumbnail = item.thumbnail;
            const isWorldCup = isWorldCupContent(item.title, item.description);

            if (isWorldCup && (!finalThumbnail || finalThumbnail === '' || !isValidArticleImage(finalThumbnail))) {
              finalThumbnail = scrapedThumbnail || getWorldCupThumbnail();
            } else if (!finalThumbnail || finalThumbnail === '') {
              finalThumbnail = scrapedThumbnail || getCategoryFallbackImage(finalCategorySlug);
            }

            const priority = calculatePriorityScore(item.title, item.description);

            // Assign author with priority overrides:
            // 1. Financial/insurance/business from Canada -> Matthew
            // 2. A reporter's specifically assigned region (Nigeria, Canada,
            //    USA, Europe, Middle East, Asia, Africa, Sports) -> that
            //    reporter, even for entertainment/celebrity/lifestyle
            //    content, so regional coverage isn't siphoned away from
            //    Matthew, Gbenga, and the others by category alone.
            // 3. Entertainment/celebrity/lifestyle from a source with no
            //    specific regional owner -> Victoria
            // 4. Default: routing rules by source country (Global/International)
            let assignedAuthor: any;
            const isFinancialCategory = financialCategorySlugs.includes(finalCategorySlug);
            const isCanadianSource = sourceCountry === 'canada';
            const isFinancialCanadian = matthewAuthor && isCanadianSource && (isFinancialCategory || isFinancialContent(item.title, item.description));

            if (isFinancialCanadian) {
              assignedAuthor = matthewAuthor;
            } else if (sourceHasSpecificRegion) {
              assignedAuthor = defaultAuthorForSource;
            } else if (victoriaAuthor && victoriaCategorySlugs.includes(finalCategorySlug)) {
              assignedAuthor = victoriaAuthor;
            } else {
              assignedAuthor = defaultAuthorForSource;
            }

            const { error } = await supabase.from('media_content').insert({
              title: stripHtml(item.title),
              slug,
              description: finalDescription,
              content: finalContent,
              category_id: articleCategory?.id,
              author_id: assignedAuthor?.id || null,
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
              countryAddedCount[country]++;
            }
          }
          if (countryAddedCount[country] >= targetArticles) break;
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
