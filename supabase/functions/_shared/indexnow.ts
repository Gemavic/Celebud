// Instant indexing via IndexNow.
//
// Without this, a newly published article sits there until a search engine
// happens to crawl the site again — which for a young news site can be days.
// IndexNow flips that around: we tell the search engines the moment a story
// goes live, and they come and fetch it.
//
// One submission reaches Bing, Yandex, Seznam, Naver and other participating
// engines. It is free, needs no account, and no API key beyond a
// verification file hosted at the domain root.
//
// Google does NOT participate in IndexNow, and it retired its sitemap ping
// endpoint in 2023 — Google discovery relies on the sitemap declared in
// robots.txt plus Search Console, both already in place.

const INDEXNOW_KEY = '7cbb1d11f12617ef3000293d094803da';
const SITE_HOST = 'celebud.com';
const KEY_LOCATION = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;

// IndexNow accepts up to 10,000 URLs per request; stay well under it.
const MAX_URLS_PER_SUBMISSION = 1000;

export interface IndexNowResult {
  submitted: number;
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Tell participating search engines that these URLs are new or updated.
 *
 * Never throws: indexing is a nice-to-have, so a failure here must never
 * break the job that published the content.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const unique = [...new Set(urls.filter((u) => u && u.startsWith(`https://${SITE_HOST}`)))]
    .slice(0, MAX_URLS_PER_SUBMISSION);

  if (unique.length === 0) return { submitted: 0, ok: true };

  try {
    const resp = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: unique,
      }),
    });

    // 200 = accepted, 202 = accepted but key still being verified.
    const ok = resp.status === 200 || resp.status === 202;
    if (!ok) {
      console.error('IndexNow rejected submission:', resp.status, (await resp.text()).slice(0, 200));
    }
    return { submitted: unique.length, ok, status: resp.status };
  } catch (error) {
    console.error('IndexNow submission failed:', error);
    return {
      submitted: 0,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}
