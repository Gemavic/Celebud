// Topical thumbnail selection shared by fetch-news and enrich-articles.
//
// Why this exists: thumbnails used to be picked at random from a small pool
// keyed only on the broad category, so a wildfire story and a murder trial
// both landed in "security" and drew the same arbitrary photo. Two changes
// fix that:
//   1. detectImageTopic() classifies the SUBJECT (wildfire, earthquake,
//      aviation, crypto, football...), which is far narrower than category.
//   2. Selection is deterministic on the article's own slug, so a given
//      article always keeps the same image and neighbouring articles spread
//      across the pool instead of randomly clustering on one photo.
//
// If a PEXELS_API_KEY secret is present we search Pexels for a genuinely
// on-subject photo (free, commercial-use, no attribution required). Without
// it everything still works — it just falls back to the curated pools below,
// which are the URLs already proven live on the site.

export interface TopicMatch {
  /** Pool key used for the offline fallback image. */
  pool: string;
  /** Human search phrase used when a photo API is available. */
  query: string;
}

/**
 * Subject-level topics, checked before the broad category.
 * Order matters: the first topic with a keyword hit wins, so put the
 * specific ones above the generic ones.
 */
const SUBJECT_TOPICS: Array<{ pool: string; query: string; keywords: string[] }> = [
  { pool: 'disaster', query: 'wildfire forest fire', keywords: ['wildfire', 'wildfires', 'bushfire', 'forest fire', 'blaze', 'firefighter', 'firefighters'] },
  { pool: 'disaster', query: 'earthquake damage', keywords: ['earthquake', 'earthquakes', 'quake', 'tremor', 'aftershock', 'seismic'] },
  { pool: 'disaster', query: 'flood water disaster', keywords: ['flood', 'flooding', 'floods', 'flooded', 'landslide', 'mudslide'] },
  { pool: 'disaster', query: 'hurricane storm', keywords: ['hurricane', 'typhoon', 'cyclone', 'tornado', 'storm surge'] },
  { pool: 'disaster', query: 'heatwave sun drought', keywords: ['heat wave', 'heatwave', 'drought', 'wildfire risk'] },
  { pool: 'disaster', query: 'building collapse rubble', keywords: ['building collapse', 'collapsed building', 'rubble', 'debris'] },
  { pool: 'aviation', query: 'airplane airport', keywords: ['plane crash', 'aircraft', 'airline', 'airliner', 'airport', 'flight', 'aviation', 'boeing', 'airbus'] },
  { pool: 'security', query: 'police line emergency', keywords: ['gunmen', 'bandit', 'bandits', 'kidnap', 'kidnapped', 'abducted', 'insurgent', 'militant', 'boko haram', 'terrorist', 'terrorism', 'ambush', 'massacre'] },
  { pool: 'security', query: 'police officer patrol', keywords: ['police', 'arrested', 'suspect', 'manhunt', 'robbery', 'shooting', 'stabbing'] },
  { pool: 'military', query: 'soldiers military', keywords: ['military', 'troops', 'soldier', 'soldiers', 'army', 'airstrike', 'war', 'ceasefire', 'missile', 'drone strike'] },
  { pool: 'legal', query: 'courtroom justice gavel', keywords: ['court', 'courtroom', 'trial', 'verdict', 'sentenced', 'convicted', 'lawsuit', 'judge', 'tribunal', 'prosecutor', 'appeal'] },
  { pool: 'politics', query: 'government parliament building', keywords: ['election', 'parliament', 'senate', 'congress', 'president', 'governor', 'minister', 'lawmaker', 'ballot', 'campaign', 'inec', 'referendum'] },
  { pool: 'politics', query: 'diplomacy flags summit', keywords: ['diplomatic', 'embassy', 'summit', 'treaty', 'sanctions', 'united nations', 'nato', 'bilateral'] },
  { pool: 'immigration', query: 'passport immigration travel', keywords: ['immigration', 'immigrant', 'visa', 'refugee', 'asylum', 'deportation', 'deported', 'migrant', 'work permit', 'citizenship', 'green card'] },
  // Entertainment sits ABOVE the money topics on purpose: a named show or
  // artist is a much stronger signal than a passing mention of "business",
  // which used to drag celebrity stories into the finance pool.
  { pool: 'celebrity', query: 'television studio reality show', keywords: ['bbnaija', 'big brother', 'reality show', 'reality tv', 'housemate', 'housemates'] },
  { pool: 'celebrity', query: 'red carpet event glamour', keywords: ['red carpet', 'paparazzi', 'kardashian', 'davido', 'wizkid', 'burna boy', 'beyonce', 'taylor swift', 'engagement', 'wedding', 'divorce'] },
  { pool: 'film', query: 'cinema film production', keywords: ['movie', 'movies', 'film', 'cinema', 'box office', 'nollywood', 'hollywood', 'netflix', 'tv series', 'oscar', 'emmy', 'premiere', 'actor', 'actress', 'film director', 'screenplay'] },
  { pool: 'music', query: 'concert music stage', keywords: ['album', 'concert', 'grammy', 'rapper', 'singer', 'musician', 'afrobeats', 'record label', 'soundtrack', 'single release', 'music video', 'world tour'] },
  { pool: 'football', query: 'football soccer stadium', keywords: ['world cup', 'fifa', 'premier league', 'champions league', 'la liga', 'serie a', 'bundesliga', 'super eagles', 'football', 'soccer', 'goalkeeper', 'striker'] },
  { pool: 'sports', query: 'sports athlete competition', keywords: ['olympic', 'olympics', 'basketball', 'nba', 'tennis', 'cricket', 'rugby', 'boxing', 'marathon', 'athlete', 'athletes', 'medal', 'championship', 'tournament'] },
  { pool: 'finance', query: 'stock market trading chart', keywords: ['stock market', 'wall street', 'nasdaq', 'dow jones', 'shares', 'ipo', 'investor', 'bond', 'dividend', 'hedge fund'] },
  { pool: 'crypto', query: 'cryptocurrency bitcoin', keywords: ['bitcoin', 'cryptocurrency', 'crypto', 'ethereum', 'blockchain', 'stablecoin', 'token'] },
  { pool: 'finance', query: 'bank finance money', keywords: ['bank', 'banking', 'central bank', 'interest rate', 'inflation', 'currency', 'exchange rate', 'naira', 'pension', 'tax', 'taxes', 'benefit payment', 'benefit payments', 'tax credit', 'welfare', 'subsidy', 'subsidies', 'igr', 'internally generated revenue'] },
  { pool: 'energy', query: 'nuclear power plant', keywords: ['nuclear', 'chernobyl', 'fukushima', 'reactor', 'uranium', 'radioactive'] },
  { pool: 'energy', query: 'oil refinery energy', keywords: ['oil', 'crude', 'petrol', 'refinery', 'opec', 'gas price', 'pipeline', 'energy prices', 'electricity', 'power grid', 'renewable energy', 'solar power'] },
  { pool: 'infrastructure', query: 'road construction infrastructure', keywords: ['road project', 'road projects', 'highway', 'bridge', 'contractor', 'contractors', 'construction', 'infrastructure', 'housing project', 'rail line', 'water supply'] },
  { pool: 'business', query: 'business office corporate', keywords: ['company', 'corporate', 'merger', 'acquisition', 'startup', 'ceo', 'revenue', 'profit', 'earnings', 'layoffs', 'bankruptcy', 'factory', 'retail'] },
  { pool: 'technology', query: 'artificial intelligence technology', keywords: ['artificial intelligence', 'machine learning', ' ai ', 'chatgpt', 'algorithm', 'data breach', 'cybersecurity', 'hacking', 'software', 'semiconductor', 'smartphone', 'robot'] },
  { pool: 'health', query: 'hospital healthcare doctor', keywords: ['hospital', 'disease', 'outbreak', 'virus', 'vaccine', 'cancer', 'surgery', 'patient', 'patients', 'clinical', 'epidemic', 'pandemic', 'cholera', 'malaria', 'hiv', 'aids', 'tuberculosis', 'medical test', 'medical tests', 'mental health', 'maternal'] },
  { pool: 'education', query: 'students classroom school', keywords: ['university', 'school', 'student', 'scholarship', 'exam', 'jamb', 'waec', 'graduation', 'curriculum', 'lecturer'] },
  { pool: 'lifestyle', query: 'fashion lifestyle style', keywords: ['fashion', 'beauty', 'skincare', 'makeup', 'recipe', 'cooking', 'fitness', 'wellness', 'interior design', 'parenting'] },
  { pool: 'travel', query: 'travel destination tourism', keywords: ['tourism', 'tourist', 'vacation', 'hotel', 'resort', 'cruise', 'destination', 'sightseeing'] },
  { pool: 'society', query: 'community people crowd', keywords: ['protest', 'demonstration', 'rally', 'human rights', 'charity', 'humanitarian', 'discrimination', 'inequality', 'activist', 'ngo', 'church', 'mosque'] },
  { pool: 'environment', query: 'climate environment nature', keywords: ['climate change', 'global warming', 'emissions', 'carbon', 'conservation', 'wildlife', 'deforestation', 'pollution', 'renewable'] },
];

/**
 * Curated fallback pools. Every URL here is one already serving on the live
 * site, so none of them 404 — new pools reuse the closest verified images
 * rather than guessing at unverified photo IDs.
 */
const POOLS: Record<string, string[]> = {
  disaster: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80',
    'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1200&q=80',
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80',
  ],
  aviation: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80',
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1200&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
  ],
  military: [
    'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=1200&q=80',
    'https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=1200&q=80',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
  ],
  crypto: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=80',
  ],
  energy: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80',
  ],
  football: [
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
    'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&q=80',
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80',
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80',
  ],
  music: [
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&q=80',
    'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1200&q=80',
    'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=1200&q=80',
  ],
  film: [
    'https://images.unsplash.com/photo-1574267432644-f610f5ac2b0f?w=1200&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
  ],
  infrastructure: [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  ],
  environment: [
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80',
    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80',
  ],
  immigration: [
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
    'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&q=80',
    'https://images.unsplash.com/photo-1569098644584-210bcd375b59?w=1200&q=80',
    'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=1200&q=80',
  ],
  politics: [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=80',
    'https://images.unsplash.com/photo-1551135049-8a33b5883817?w=1200&q=80',
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80',
    'https://images.unsplash.com/photo-1555374018-13a8994ab246?w=1200&q=80',
  ],
  business: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80',
  ],
  finance: [
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=80',
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1574267432644-f610f5ac2b0f?w=1200&q=80',
    'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=1200&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&q=80',
    'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=1200&q=80',
  ],
  celebrity: [
    'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1200&q=80',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80',
    'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1200&q=80',
  ],
  lifestyle: [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80',
    'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=1200&q=80',
    'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200&q=80',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
  ],
  education: [
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80',
    'https://images.unsplash.com/photo-1519406596751-0a3ccc4937fe?w=1200&q=80',
  ],
  travel: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80',
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1200&q=80',
  ],
  society: [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
    'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&q=80',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&q=80',
    'https://images.unsplash.com/photo-1528605105345-5344ea20e269?w=1200&q=80',
  ],
  security: [
    'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=1200&q=80',
    'https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=1200&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&q=80',
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80',
  ],
  sports: [
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80',
    'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=1200&q=80',
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80',
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80',
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80',
    'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&q=80',
  ],
  health: [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1200&q=80',
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80',
  ],
  legal: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80',
    'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=80',
    'https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?w=1200&q=80',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80',
  ],
  news: [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80',
    'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1200&q=80',
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80',
  ],
};

/** Whole-word test, so 'ucl' can never match inside 'nuclear'. */
function wordMatch(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

/** Stable non-cryptographic hash, so an article keeps the same image. */
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h;
}

/** Classify by subject first, then fall back to the article's category. */
export function detectImageTopic(
  title: string,
  description: string,
  categorySlug?: string | null
): TopicMatch {
  const text = `${title || ''} ${description || ''}`;
  for (const topic of SUBJECT_TOPICS) {
    if (topic.keywords.some((kw) => wordMatch(text, kw))) {
      return { pool: topic.pool, query: topic.query };
    }
  }
  const pool = categorySlug && POOLS[categorySlug] ? categorySlug : 'news';
  return { pool, query: `${categorySlug || 'news'} editorial` };
}

/** Deterministic pick from the topic's pool — same seed always same image. */
export function pickStockImage(pool: string, seed: string): string {
  const images = POOLS[pool] || POOLS.news;
  return images[hashString(seed) % images.length];
}

/**
 * Optional upgrade: a genuinely on-subject photo from Pexels (free tier,
 * commercial use, no attribution required). Returns null when no key is
 * configured or the lookup fails, so callers always fall back to the pools.
 */
export async function searchPexelsImage(query: string, seed: string): Promise<string | null> {
  const apiKey = Deno.env.get('PEXELS_API_KEY');
  if (!apiKey) return null;
  try {
    // 80 (the API maximum) rather than 15. With only 15 candidates per
    // topic, the 59 football stories on the site could only ever land on 15
    // different photos — and the curated pools they came from held just 4,
    // which is how 59 unrelated articles ended up sharing one picture.
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=80&orientation=landscape`;
    const resp = await fetch(url, { headers: { Authorization: apiKey } });
    if (resp.status === 429) {
      // Free tier is rate limited. Flag it so a bulk repair can stop
      // cleanly instead of grinding through thousands of failed lookups.
      pexelsRateLimited = true;
      return null;
    }
    if (!resp.ok) return null;
    const data = await resp.json();
    const photos: Array<{ src?: { large2x?: string; large?: string } }> = data?.photos || [];
    if (photos.length === 0) return null;
    // Deterministic choice spreads similar stories across the result set
    // instead of every one of them taking the single top hit.
    const photo = photos[hashString(seed) % photos.length];
    return photo?.src?.large2x || photo?.src?.large || null;
  } catch {
    return null;
  }
}

/** Set when Pexels answers 429; lets a bulk job stop rather than churn. */
let pexelsRateLimited = false;
export function isPexelsRateLimited(): boolean {
  return pexelsRateLimited;
}
export function resetPexelsRateLimit(): void {
  pexelsRateLimited = false;
}

/** One call for the common case: best available image for an article. */
export async function resolveArticleImage(
  title: string,
  description: string,
  categorySlug: string | null | undefined,
  seed: string
): Promise<string> {
  const topic = detectImageTopic(title, description, categorySlug);
  const fromApi = await searchPexelsImage(topic.query, seed);
  return fromApi || pickStockImage(topic.pool, seed);
}

// ── Re-hosting ──────────────────────────────────────────────────────────
//
// Pointing an <img> straight at a publisher's own server ("hotlinking") is
// what left 60 live articles showing a broken image icon. The file is fine —
// the publisher simply refuses to serve it to anyone else. Tribune Online,
// Premium Times, Blueprint and Leadership all return 403 Forbidden when the
// browser says the request came from celebud.com, even though the identical
// URL returns the image normally when fetched server-side.
//
// So: fetch it once from the edge function (which sends no browser Referer,
// and is the request the publisher allows), store the bytes in CelebUD's own
// bucket, and point the article at that copy. It cannot break afterwards.

/** Hosts we serve from ourselves or that are built for third-party embedding. */
export function isDurableImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return (
      host.endsWith('.supabase.co') ||
      host === 'images.pexels.com' ||
      host === 'images.unsplash.com'
    );
  } catch {
    return false;
  }
}

/**
 * A generic category photo from the curated pools above, rather than a
 * picture of the actual story.
 *
 * These are the reason unrelated articles looked identical: each pool holds
 * only 3-6 images, so with ~1,300 articles drawing from them, 59 different
 * football stories ended up on the same stadium photo. They are not broken —
 * they load perfectly — they are simply not about the story, so they get
 * upgraded to a real on-subject photo when one can be found.
 */
export function isGenericStockImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('images.unsplash.com');
}

const MIN_IMAGE_BYTES = 1024;              // smaller than this is a spacer/tracking pixel
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // guard the function's memory

/**
 * Downloads an image and stores it in CelebUD's own `media` bucket.
 * Returns the public URL, or null if it could not be fetched or stored —
 * callers must treat null as "no usable image".
 */
export async function rehostImage(
  // Loosely typed so this module stays free of a supabase-js import.
  supabase: { storage: { from: (bucket: string) => any } },
  sourceUrl: string,
  seed: string
): Promise<string | null> {
  if (!sourceUrl) return null;
  // Already durable — copying it again would just waste storage.
  if (isDurableImageHost(sourceUrl)) return sourceUrl;

  try {
    const resp = await fetch(sourceUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      // Deliberately NO Referer. That header is exactly what the publishers
      // block on, and server-side fetches are the request they do allow.
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CelebUD/1.0; +https://celebud.com)',
        Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*',
      },
    });
    if (!resp.ok) return null;

    const contentType = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') return null;

    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (bytes.byteLength < MIN_IMAGE_BYTES || bytes.byteLength > MAX_IMAGE_BYTES) return null;

    const ext = contentType.includes('png') ? 'png'
      : contentType.includes('webp') ? 'webp'
      : contentType.includes('avif') ? 'avif'
      : contentType.includes('gif') ? 'gif'
      : 'jpg';

    // Deterministic on the source URL, so re-running a repair pass over the
    // same article reuses the stored copy instead of piling up duplicates.
    const path = `article-thumbnails/src-${hashString(sourceUrl)}-${hashString(seed || sourceUrl)}.${ext}`;

    const { error } = await supabase.storage.from('media').upload(path, bytes, {
      contentType,
      cacheControl: '31536000',
      upsert: true,
    });
    if (error) return null;

    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl as string;
  } catch {
    return null;
  }
}

/**
 * The image an article must have before it may be published, in order of
 * preference:
 *   1. the publisher's own photo for this story, copied to our bucket
 *   2. a genuinely on-subject real photo from Pexels
 * Returns null when neither is available — the caller must then refuse to
 * publish rather than ship a story with a broken or missing picture.
 *
 * The curated Unsplash pools are deliberately NOT used here: they are generic
 * category art, and falling back to them is what made unrelated stories share
 * the same stock photo.
 */
export async function resolvePublishableThumbnail(
  supabase: { storage: { from: (bucket: string) => any } },
  opts: {
    sourceImage?: string | null;
    title: string;
    description?: string | null;
    categorySlug?: string | null;
    seed: string;
  }
): Promise<{ url: string; source: 'publisher' | 'pexels' } | null> {
  if (opts.sourceImage) {
    const rehosted = await rehostImage(supabase, opts.sourceImage, opts.seed);
    if (rehosted) return { url: rehosted, source: 'publisher' };
  }

  const topic = detectImageTopic(opts.title, opts.description || '', opts.categorySlug);
  const pexels = await searchPexelsImage(topic.query, opts.seed);
  if (pexels) return { url: pexels, source: 'pexels' };

  return null;
}
