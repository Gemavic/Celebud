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

// An article this short is a headline and a couple of paragraphs — a wire
// summary, not a piece worth ranking on its own. Google calls these "thin"
// and a site carrying enough of them reads as low-value in review. There
// are 98 of them published here, and they were all being submitted in
// sitemap.xml. They stay readable on the site; they just stop asking to be
// indexed. Raise or lower this and the sitemap follows automatically —
// generate-sitemap applies the same number.
const THIN_ARTICLE_WORDS = 300;

function countWords(html: string): number {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// --- Static trust pages -------------------------------------------------
//
// /about, /contact, /editorial-standards and /privacy are plain React
// components with no data behind them, so nothing ever routed a crawler to
// them: they returned the empty SPA shell carrying the HOMEPAGE's title
// tag. That matters more than an ordinary missing page, because these are
// precisely the pages a reviewer opens to check a site is a real
// publication — and three of them were being advertised in sitemap.xml at
// the same time, so Google was being invited to crawl pages that rendered
// blank.
//
// KEEP IN SYNC with src/pages/TrustPages.tsx and src/pages/PrivacyPolicy.tsx.
// This must stay a faithful copy of what a reader sees. Serving a crawler
// something different from the human page is cloaking — a considerably
// worse problem than the one being fixed here.
const STATIC_PAGES: Record<string, { title: string; description: string; bodyHtml: string }> = {
  '/about': {
    title: `About CelebUD — Who We Are | ${SITE_NAME}`,
    description:
      'CelebUD is a digital magazine covering celebrity news, entertainment, politics, society, lifestyle, business and financial education, operated by Gemavic Media in Ontario, Canada.',
    bodyHtml: `
<h1>About CelebUD</h1>
<p>Who we are and what we stand for</p>
<p><strong>CelebUD</strong> is a digital magazine covering celebrity news, entertainment, politics, society, lifestyle, business, and financial education for readers in Africa, North America, and beyond. We publish around the clock — combining original reporting from our editorial team with curated coverage of the stories shaping our readers' world.</p>
<p>CelebUD is operated by <strong>Gemavic Media</strong>, based in Ontario, Canada, with a reporting network across Nigeria and the diaspora. Our newsroom is led by our Editor-in-Chief and staffed by named, accountable reporters — every article on CelebUD carries a byline you can click to see who wrote or curated it.</p>
<h2>What we cover</h2>
<ul>
  <li><strong>News &amp; Politics</strong> — Nigeria, Canada, and world affairs</li>
  <li><strong>Entertainment &amp; Society</strong> — celebrity culture, film, music, and events</li>
  <li><strong>Fin-Advisor</strong> — our dedicated financial &amp; insurance education hub with free planning calculators</li>
  <li><strong>Lifestyle &amp; Videos</strong> — original creator content from our Content Studio</li>
</ul>
<p>Want to join our reporting team? <a href="/reporters/apply">Apply here</a>. For everything else, see our <a href="/contact">Contact page</a> or read our <a href="/editorial-standards">Editorial Standards</a>.</p>`,
  },
  '/contact': {
    title: `Contact Us — Tips, Corrections & Partnerships | ${SITE_NAME}`,
    description:
      'Contact the CelebUD newsroom: editorial enquiries at info@celebud.com, SMS/WhatsApp +1 (437) 788-8011, news tips, corrections, advertising and partnerships. Based in Ontario, Canada.',
    bodyHtml: `
<h1>Contact Us</h1>
<p>We read everything — questions, tips, corrections, and partnerships</p>
<ul>
  <li><strong>Editorial &amp; General:</strong> <a href="mailto:info@celebud.com">info@celebud.com</a></li>
  <li><strong>SMS / WhatsApp:</strong> <a href="tel:+14377888011">+1 (437) 788-8011</a></li>
  <li><strong>News tips &amp; corrections:</strong> <a href="mailto:info@celebud.com?subject=News%20tip%20or%20correction">Send story tips or request a correction</a></li>
  <li><strong>Location:</strong> Ontario, Canada</li>
</ul>
<p><strong>Corrections:</strong> if we got something wrong, tell us. Verified corrections are made promptly and noted on the article. See our <a href="/editorial-standards">Editorial Standards</a> for how we handle accuracy.</p>
<p><strong>Advertising &amp; partnerships:</strong> reach a fast-growing audience across Africa and North America — email us with "Advertising" in the subject line.</p>`,
  },
  '/editorial-standards': {
    title: `Editorial Standards — Accuracy, Attribution & Corrections | ${SITE_NAME}`,
    description:
      'How CelebUD reports, curates, attributes and corrects: standards for accuracy and verification, attribution of curated stories, corrections policy, editorial independence and sponsored content labelling.',
    bodyHtml: `
<h1>Editorial Standards</h1>
<p>How CelebUD reports, curates, attributes, and corrects</p>
<p>Our credibility is our product. These standards apply to every story published on CelebUD, whether originally reported or curated from other outlets.</p>
<h2>Accuracy &amp; verification</h2>
<p>We verify facts before publishing. Where a story is developing, we say so plainly and update it as facts emerge. Headlines must reflect the substance of the story.</p>
<h2>Attribution &amp; curation</h2>
<p>Some CelebUD stories are curated from other news organizations. Curated stories always identify the original publisher, and the CelebUD staff member shown on such stories is credited as the <em>curator</em>, not the original author. Original reporting is bylined by the reporter who wrote it.</p>
<h2>Corrections</h2>
<p>When we publish an error, we correct the article promptly. Material corrections are noted within the article. To request a correction, use our <a href="/contact">Contact page</a>.</p>
<h2>Independence &amp; sponsored content</h2>
<p>Advertising never dictates editorial coverage. Sponsored or affiliate content is labeled as such wherever it appears.</p>
<h2>Our team</h2>
<p>Every byline links to an author profile listing that reporter's coverage. Reporters join through a vetted <a href="/reporters/apply">application process</a> reviewed by our Editor-in-Chief.</p>`,
  },
  '/privacy': {
    title: `Privacy Policy | ${SITE_NAME}`,
    description:
      'How CelebUD collects, uses, shares and retains your information, including Google AdSense advertising cookies, analytics, your rights, and how to opt out of personalised advertising.',
    bodyHtml: `
<h1>Privacy Policy</h1>
<p>Effective date: June 13, 2026</p>
<h2>1. Information We Collect</h2>
<p>We collect several types of information in connection with the operation of our site:</p>
<ul>
  <li><strong>Account information:</strong> When you register, we collect your email address and a username of your choosing.</li>
  <li><strong>Usage data:</strong> We automatically collect information about how you interact with the site, including pages visited, articles read, time spent on pages, and referring URLs.</li>
  <li><strong>Device information:</strong> Browser type, operating system, IP address, and device identifiers are logged as part of standard web server operation.</li>
  <li><strong>Comments and submissions:</strong> Any content you voluntarily submit — comments, creator applications, newsletter sign-ups — is collected and stored.</li>
  <li><strong>Cookies:</strong> We and our advertising partners use cookies and similar tracking technologies.</li>
</ul>
<h2>2. How We Use Your Information</h2>
<ul>
  <li>Provide, maintain, and improve the website and its features</li>
  <li>Authenticate users and manage accounts</li>
  <li>Send newsletters and editorial updates you have subscribed to</li>
  <li>Analyze traffic and usage patterns to understand and improve our content</li>
  <li>Display relevant advertising through Google AdSense and other ad networks</li>
  <li>Comply with legal obligations and enforce our terms</li>
</ul>
<h2>3. Google AdSense and Third-Party Advertising</h2>
<p>CelebUD uses Google AdSense to display advertisements. Google AdSense uses cookies to serve ads based on your prior visits to this website and other websites on the internet. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to our site and/or other sites on the Internet.</p>
<p>You may opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a> or <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">www.aboutads.info/choices</a>.</p>
<p>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our website or other websites. For more information on how Google uses data when you use our site, visit <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Google's Privacy &amp; Terms</a>.</p>
<h2>4. Analytics</h2>
<p>We may use analytics services (such as Google Analytics) to collect and analyze traffic data. These services use cookies and similar technologies to collect information about your use of the site and report website trends without identifying individual visitors. You can opt out of Google Analytics by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics opt-out browser add-on</a>.</p>
<h2>5. Cookies</h2>
<p>Cookies are small text files stored on your device when you visit a website. We use cookies to keep you signed in to your account, remember your preferences, understand how you navigate the site, and deliver and measure personalised advertisements via Google AdSense.</p>
<p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, some portions of our service may not function properly.</p>
<h2>6. Sharing of Information</h2>
<p>We do not sell your personal information. We may share information with:</p>
<ul>
  <li><strong>Service providers:</strong> Supabase (database and authentication), Vercel (hosting), Stripe (payments), and Google (advertising and analytics) as necessary to operate the site.</li>
  <li><strong>Legal requirements:</strong> We may disclose information if required by law, court order, or governmental authority.</li>
  <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.</li>
</ul>
<h2>7. Data Retention</h2>
<p>We retain your information for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our agreements.</p>
<h2>8. Children's Privacy</h2>
<p>Our service is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>
<h2>9. Your Rights</h2>
<p>Depending on where you live, you may have the right to access, correct, or delete the personal information we hold about you, and to object to or restrict certain processing. Contact us to exercise these rights.</p>
<h2>10. External Links</h2>
<p>Our site contains links to other websites. We are not responsible for the privacy practices or content of those third-party sites.</p>
<h2>11. Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated effective date.</p>
<h2>12. Contact Us</h2>
<p>Questions about this policy? Email <a href="mailto:info@celebud.com">info@celebud.com</a> or use our <a href="/contact">Contact page</a>.</p>`,
  },
};

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
  keywords,
  extraJsonLd,
  extraHead,
}: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type: 'website' | 'article';
  jsonLd: Record<string, unknown>;
  bodyHtml: string;
  keywords?: string;
  /** Optional second JSON-LD block, e.g. BreadcrumbList. */
  extraJsonLd?: Record<string, unknown>;
  /** Extra <head> tags, e.g. og:video / og:audio for a media page. */
  extraHead?: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}" />` : ''}
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

${extraHead || ''}
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${extraJsonLd ? `<script type="application/ld+json">${JSON.stringify(extraJsonLd)}</script>` : ''}
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
    // --- Static trust pages: /about, /contact, /privacy, /editorial-standards ---
    const staticPage = STATIC_PAGES[path.replace(/\/+$/, '') || '/'];
    if (staticPage) {
      const url = `${SITE_URL}${path}`;
      return new Response(
        baseHtml({
          title: staticPage.title,
          description: staticPage.description,
          url,
          type: 'website',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: staticPage.title,
            description: staticPage.description,
            url,
            publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
          },
          bodyHtml: staticPage.bodyHtml,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // --- Listing hubs: /originals and /fin-advisor ---
    //
    // Both are in sitemap.xml. Without a branch of their own they would
    // fall through to the homepage listing below and return a byte-for-byte
    // copy of the homepage under a different URL — trading an empty page
    // for a duplicate one, which is not an improvement. Each gets the
    // articles its React page actually shows.
    const LISTING_HUBS: Record<
      string,
      { title: string; description: string; heading: string; intro: string }
    > = {
      '/originals': {
        title: `CelebUD Originals — Reporting and Features by Our Newsroom | ${SITE_NAME}`,
        description:
          'CelebUD Originals: features, tributes, interviews and analysis written by the CelebUD newsroom rather than curated from the wires.',
        heading: 'CelebUD Originals',
        intro:
          'Features, tributes, interviews and analysis written by our own newsroom — the work our reporters produce first-hand, not curated from other outlets.',
      },
      '/fin-advisor': {
        title: `Fin-Advisor — Financial & Insurance Education Center | ${SITE_NAME}`,
        description:
          'Plain-English guides to insurance, personal finance and business for readers in Canada and Nigeria, plus free planning calculators.',
        heading: 'Financial & Insurance Education Center',
        intro:
          'Plain-English guides to insurance, personal finance and business for readers in Canada, Nigeria and the diaspora — plus free planning calculators.',
      },
    };
    const hub = LISTING_HUBS[path.replace(/\/+$/, '')];
    if (hub) {
      const isOriginals = path.startsWith('/originals');
      let hubQuery = supabase
        .from('media_content')
        .select('id, slug, title, description, published_at, categories!inner(name, slug)')
        .eq('media_type', 'article')
        .eq('is_published', true);
      hubQuery = isOriginals
        ? hubQuery.eq('is_pinned', true)
        : hubQuery.in('categories.slug', ['fin-advisor', 'finance', 'business']);

      const { data: rows } = await hubQuery
        .order('published_at', { ascending: false })
        .limit(60);

      const items = (rows || [])
        .map(
          (a: { id: string; slug?: string | null; title: string; description?: string | null }) =>
            `<li><a href="${articlePath(a)}">${escapeHtml(a.title)}</a>${
              a.description ? ` — ${escapeHtml(a.description)}` : ''
            }</li>`
        )
        .join('\n');
      const url = `${SITE_URL}${path}`;

      return new Response(
        baseHtml({
          title: hub.title,
          description: hub.description,
          url,
          type: 'website',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: hub.heading,
            description: hub.description,
            url,
            publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
          },
          bodyHtml: `
<h1>${escapeHtml(hub.heading)}</h1>
<p>${escapeHtml(hub.intro)}</p>
<ul>
${items}
</ul>`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // --- Author profile: /author/:id ---
    // Every byline on the site links here, so these are among the most
    // linked-to pages CelebUD has — and they were returning the empty
    // shell. A named writer with a visible body of work is the clearest
    // signal that a site is staffed by real, accountable people rather
    // than assembled automatically.
    // authors.id is a uuid: querying .eq('id', 'not-a-uuid') is a Postgres
    // type error, not an empty result, so a junk URL would 500 instead of
    // falling through. Check the shape before asking the database.
    const authorMatch = path.match(
      /^\/author\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
    if (authorMatch) {
      const { data: author } = await supabase
        .from('authors')
        .select('id, name, bio, avatar_url')
        .eq('id', authorMatch[1])
        .maybeSingle();

      if (author) {
        const { data: byline } = await supabase
          .from('media_content')
          .select('id, slug, title, description, published_at')
          .eq('author_id', author.id)
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(50);

        const items = (byline || [])
          .map(
            (a: { id: string; slug?: string | null; title: string; published_at?: string }) =>
              `<li><a href="${articlePath(a)}">${escapeHtml(a.title)}</a></li>`
          )
          .join('\n');
        const url = `${SITE_URL}/author/${author.id}`;

        return new Response(
          baseHtml({
            title: `${author.name} — Articles and Profile | ${SITE_NAME}`,
            description:
              author.bio ||
              `${author.name} writes for ${SITE_NAME}. Read their latest reporting, interviews and analysis.`,
            image: author.avatar_url || undefined,
            url,
            type: 'website',
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              mainEntity: {
                '@type': 'Person',
                name: author.name,
                description: author.bio || undefined,
                image: author.avatar_url || undefined,
                url,
                worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
              },
            },
            bodyHtml: `
<h1>${escapeHtml(author.name)}</h1>
${author.bio ? `<p>${escapeHtml(author.bio)}</p>` : ''}
<h2>Articles by ${escapeHtml(author.name)}</h2>
<ul>
${items}
</ul>`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    }

    // --- Creator video / audio page: /watch/:id ---
    //
    // Before this existed, the Content Studio share buttons had no CelebUD
    // page to point at, so they shared the raw storage file instead. Facebook
    // and X then showed "bwtrtzvlqvykobmlfjcl.supabase.co" as the source with
    // a blank preview, because an .mp4/.mp3 file carries no title, no
    // description and no image. This gives every clip a real page on
    // celebud.com with proper preview tags.
    const watchMatch = path.match(/^\/watch\/([^/?#]+)/);
    if (watchMatch) {
      const id = watchMatch[1];
      const { data: item } = await supabase
        .from('creator_content')
        .select('id, title, description, content_type, media_url, thumbnail_url, external_url, created_at, status')
        .eq('id', id)
        .maybeSingle();

      if (!item || item.status !== 'published') {
        return new Response('Not found', { status: 404, headers: corsHeaders });
      }

      const url = `${SITE_URL}/watch/${item.id}`;
      const isAudio = item.content_type === 'audio';
      const description =
        (item.description || '').trim() ||
        `${isAudio ? 'Listen' : 'Watch'} "${item.title}" on ${SITE_NAME}.`;
      // A video with no poster gets no og:image, which is what produced the
      // blank grey preview box. Fall back to the site logo so the card always
      // renders as CelebUD rather than an empty rectangle.
      const image = item.thumbnail_url || `${SITE_URL}/icon-512.png`;

      // Only OUR OWN hosted files may be declared as playable media. A link
      // to someone's X/YouTube post is a link, not a file we can stream.
      const ownFile =
        typeof item.media_url === 'string' &&
        item.media_url.includes('/storage/v1/object/public/');

      const mediaTags = ownFile
        ? (isAudio
            ? `<meta property="og:audio" content="${item.media_url}" />
<meta property="og:audio:type" content="audio/mpeg" />`
            : `<meta property="og:video" content="${item.media_url}" />
<meta property="og:video:secure_url" content="${item.media_url}" />
<meta property="og:video:type" content="video/mp4" />
<meta property="og:video:width" content="1280" />
<meta property="og:video:height" content="720" />
<meta name="twitter:player" content="${url}" />`)
        : '';

      const html = baseHtml({
        title: `${item.title} | ${SITE_NAME}`,
        description,
        image,
        url,
        type: 'website',
        // Large image card unless we can actually stream the file.
        extraHead: mediaTags,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': isAudio ? 'AudioObject' : 'VideoObject',
          name: item.title,
          description,
          thumbnailUrl: image,
          uploadDate: item.created_at,
          contentUrl: item.media_url || undefined,
          embedUrl: url,
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        },
        bodyHtml: `<h1>${escapeHtml(item.title)}</h1>
<p>${escapeHtml(description)}</p>
${ownFile
  ? (isAudio
      ? `<audio controls src="${item.media_url}"></audio>`
      : `<video controls poster="${image}" src="${item.media_url}"></video>`)
  : (item.external_url || item.media_url
      ? `<p><a href="${item.external_url || item.media_url}">View the original</a></p>`
      : '')}
<p><a href="${SITE_URL}">More from ${SITE_NAME}</a></p>`,
      });

      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // --- Article page: /article/:id ---
    const articleMatch = path.match(/^\/article\/([^/]+)/);
    if (articleMatch) {
      const id = articleMatch[1];
      const { data: article } = await supabase
        .from('media_content')
        .select('*, categories(name, slug), authors(name)')
        .eq('id', id)
        .eq('is_published', true)
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
        // Section and keywords are what Google News and Top Stories use to
        // place a story in the right topic cluster.
        articleSection: article.categories?.name || undefined,
        keywords: article.seo_keywords || undefined,
      };

      // Breadcrumbs give Google the "CelebUD › Politics › Headline" trail
      // shown above search results, which lifts click-through.
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          ...(article.categories
            ? [{
                '@type': 'ListItem',
                position: 2,
                name: article.categories.name,
                item: `${SITE_URL}/?category=${article.categories.slug}`,
              }]
            : []),
          {
            '@type': 'ListItem',
            position: article.categories ? 3 : 2,
            name: article.title,
            item: url,
          },
        ],
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
        // Prefer the purpose-written SEO title: it is trimmed to the length
        // search results actually display, so headlines are not cut off
        // mid-word in Google.
        title: `${article.seo_title || article.title} - ${SITE_NAME}`,
        description: article.description || article.title,
        keywords: article.seo_keywords || undefined,
        image: article.thumbnail_url || undefined,
        url,
        type: 'article',
        jsonLd,
        extraJsonLd: breadcrumb,
        bodyHtml,
        // A wire summary of a couple of hundred words is not a page worth
        // ranking on its own, and a site carrying a pile of them reads as
        // low-value under review. "follow" is deliberate: the page keeps
        // passing link equity to the fuller articles it points at, it just
        // stops asking to be indexed itself. Nothing is hidden from
        // readers — the article stays exactly as published.
        extraHead:
          countWords(article.content || article.description || '') < THIN_ARTICLE_WORDS
            ? '<meta name="robots" content="noindex,follow" />'
            : undefined,
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
      .eq('is_published', true)
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
        // Appending " News" unconditionally produced "News News - CelebUD"
        // for the news category itself — a duplicated word in the one line
        // Google shows as the clickable result title.
        ? `${category.charAt(0).toUpperCase() + category.slice(1)}${
            /news$/i.test(category) ? '' : ' News'
          } - ${SITE_NAME}`
        : `${SITE_NAME} - Latest Celebrity News, Entertainment & Exclusive Interviews`,
      // A category listing that repeats the site-wide description reads to a
      // crawler as another near-duplicate page. Naming the category makes
      // each listing's description its own.
      description: category
        ? `The latest ${category.toLowerCase()} stories on ${SITE_NAME} — updated daily with original reporting, interviews and analysis.`
        : 'Stay updated with the latest celebrity news, entertainment updates, exclusive interviews, and trending stories.',
      url: category ? `${SITE_URL}/?category=${category}` : SITE_URL,
      type: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        // Lets Google show a search box for the site directly in results,
        // and identifies the publisher so the brand can earn a knowledge panel.
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        publisher: {
          '@type': 'NewsMediaOrganization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
        },
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
