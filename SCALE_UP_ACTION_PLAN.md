# CelebUD Scale-Up Action Plan

## 🚨 WEEK 1 - URGENT (P0)

### 1. Security: Remove Stripe Secret Key
**Current Issue:** Stripe secret key exposed in `.env` file
```bash
# REMOVE THIS FROM .env:
STRIPE_SECRET_KEY=rk_live_1SjTpuAGQc59c5QxAGiixg5Z
```

**Fix:**
1. Delete key from `.env` file
2. Move to edge function environment variables
3. Use Supabase dashboard → Settings → Edge Functions → Secrets
4. Update checkout/webhook functions to use `Deno.env.get('STRIPE_SECRET_KEY')`
5. Rotate the compromised key in Stripe dashboard

**Time:** 30 minutes
**Impact:** Prevents potential $10K+ fraud

---

### 2. Performance: Fix N+1 Query in HomePage
**Current Issue:** Loading 100 articles when only 12 are displayed

**File:** `src/pages/HomePage.tsx:70-74`

**Current Code:**
```typescript
.limit(100), // Loads 100 articles
```

**Fix:**
```typescript
// Only load what's needed for current page
const startIndex = (currentPage - 1) * articlesPerPage;
.range(startIndex, startIndex + articlesPerPage - 1)
```

**Time:** 2 hours
**Impact:**
- Page load: 5 seconds → 1 second
- Data transfer: 2MB → 200KB
- Database load: -80%

---

### 3. Performance: Move Trending Calculation to Backend
**Current Issue:** RPC called on every user page load

**File:** `src/pages/HomePage.tsx:54`

**Current Code:**
```typescript
await supabase.rpc('update_trending_featured_flags'); // Runs on client!
```

**Fix:**
1. Remove this line from HomePage.tsx
2. Create edge function cron job:

```typescript
// supabase/functions/update-trending-cron/index.ts
Deno.serve(async () => {
  await supabase.rpc('update_trending_featured_flags');
  return new Response('OK');
});
```

3. Set up Supabase cron (Settings → Edge Functions → Cron):
```
*/15 * * * * // Every 15 minutes
```

**Time:** 1 hour
**Impact:** Removes 1000+ unnecessary calls per hour

---

### 4. Monitoring: Add Error Tracking
**Current Issue:** Errors only logged to console, no visibility

**Fix:**
```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

**Time:** 1 hour
**Cost:** Free tier: 5K events/month
**Impact:** Know about errors before users complain

---

### 5. Security: Add Rate Limiting
**Current Issue:** No protection against spam/abuse

**Fix Option A - Supabase Edge Functions:**
```typescript
// Add to each edge function
const rateLimiter = new Map();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recent = requests.filter(t => now - t < 60000); // Last minute

  if (recent.length >= 10) return false; // Max 10 requests/min

  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}
```

**Fix Option B - Upstash (Recommended):**
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
});

// Use in edge functions:
const { success } = await ratelimit.limit(clientIP);
if (!success) return new Response("Rate limit exceeded", { status: 429 });
```

**Time:** 3 hours
**Cost:** Upstash free tier: 10K requests/day
**Impact:** Prevent abuse, reduce costs

---

## 📅 MONTH 1 - HIGH PRIORITY (P1)

### 6. Add React Query for Caching
**Current Issue:** Every component fetches same data independently

**Fix:**
```bash
npm install @tanstack/react-query
```

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

```typescript
// src/hooks/useArticles.ts
export function useFeaturedArticles() {
  return useQuery({
    queryKey: ['articles', 'featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('media_content')
        .select('*')
        .eq('is_featured', true)
        .limit(5);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

**Time:** 2 days
**Impact:**
- Eliminate duplicate requests
- Instant navigation (cached data)
- Automatic background refresh
- Request deduplication

---

### 7. Implement Redis Caching
**Current Issue:** Database hit for every featured/trending request

**Setup Upstash Redis:**
1. Create account at upstash.com
2. Create Redis database
3. Add credentials to Supabase edge function secrets

**Fix:**
```typescript
// supabase/functions/_shared/cache.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return cached as T;

  const fresh = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
}

// Usage in edge functions:
const featured = await getCached(
  'articles:featured',
  async () => await fetchFeaturedArticles(),
  300 // 5 min TTL
);
```

**Time:** 1 day
**Cost:** Free tier: 10K commands/day
**Impact:**
- Response time: 500ms → 50ms
- Database load: -70%
- Supports 10x more users

---

### 8. Add Component Memoization
**Current Issue:** All components re-render on any state change

**File:** `src/components/MediaCard.tsx`

**Current Code:**
```typescript
export function MediaCard({ content }: MediaCardProps) {
  // Re-renders every time parent updates
}
```

**Fix:**
```typescript
import { memo } from 'react';

export const MediaCard = memo(function MediaCard({ content }: MediaCardProps) {
  // Only re-renders when content changes
  return (
    // ... component JSX
  );
});
```

**Apply to:**
- MediaCard
- TrendingSection
- EditorialSection
- Comment components
- CategoryFilter

**Add useMemo for expensive operations:**
```typescript
// src/pages/HomePage.tsx
const filteredContent = useMemo(() => {
  if (searchQuery) return searchResults;
  if (selectedCategory) {
    return allContent.filter(c => c.categories?.slug === selectedCategory);
  }
  return allContent;
}, [searchQuery, searchResults, selectedCategory, allContent]);
```

**Time:** 1 day
**Impact:**
- Render time: 300ms → 50ms
- Smoother scrolling
- Better mobile performance

---

### 9. Fix Memory Leaks
**Current Issue:** Subscriptions and intervals not cleaned up properly

**File:** `src/components/LiveNewsIndicator.tsx:30-35`

**Current Code:**
```typescript
useEffect(() => {
  if (!autoRefresh) return;
  const intervalId = setInterval(() => {
    handleRefresh(); // Stale closure!
  }, 30 * 60 * 1000);
  return () => clearInterval(intervalId);
}, [autoRefresh]); // Missing handleRefresh dependency
```

**Fix:**
```typescript
useEffect(() => {
  if (!autoRefresh) return;
  const intervalId = setInterval(() => {
    handleRefresh();
  }, 30 * 60 * 1000);
  return () => clearInterval(intervalId);
}, [autoRefresh, handleRefresh]); // Add all dependencies
```

**File:** `src/components/CommentsSection.tsx:55-84`

**Current Code:**
```typescript
const channel = supabase
  .channel(`comments-${contentId}`)
  .on('postgres_changes', { ... })
  .subscribe();
// Cleanup happens in useEffect return, but may be inconsistent
```

**Fix:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`comments-${contentId}`)
    .on('postgres_changes', { ... })
    .subscribe();

  return () => {
    channel.unsubscribe();
    supabase.removeChannel(channel); // Ensure full cleanup
  };
}, [contentId]);
```

**Time:** 4 hours
**Impact:** Prevent memory leaks on long sessions

---

### 10. Implement Queue System for News Fetching
**Current Issue:** Sequential processing takes 15-30 minutes

**File:** `supabase/functions/fetch-news/index.ts:503-619`

**Current Code:**
```typescript
for (const source of countrySources) {
  // Process one at a time
  await fetchArticles(source);
}
```

**Option A - Simple Parallel Processing:**
```typescript
// Process in batches of 5 sources
const BATCH_SIZE = 5;
for (let i = 0; i < countrySources.length; i += BATCH_SIZE) {
  const batch = countrySources.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(source => fetchArticles(source)));
}
```

**Option B - BullMQ (Better for scale):**
```bash
npm install bullmq ioredis
```

```typescript
// Create queue
const newsQueue = new Queue('news-fetching', {
  connection: redis,
});

// Add jobs
for (const source of countrySources) {
  await newsQueue.add('fetch-source', { source });
}

// Worker processes jobs in parallel
const worker = new Worker('news-fetching', async job => {
  await fetchArticles(job.data.source);
}, {
  connection: redis,
  concurrency: 10, // 10 parallel workers
});
```

**Time:** 2 days
**Impact:**
- Processing time: 30 min → 3 min
- Can scale to 100+ sources
- Retry failed fetches automatically

---

### 11. Add Database Monitoring
**Setup pg_stat_statements:**

```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Add Supabase Dashboard Monitoring:**
1. Go to Supabase Dashboard → Database → Query Performance
2. Enable "Track all queries"
3. Set alerts for queries > 1 second

**Time:** 1 hour
**Impact:** Identify slow queries proactively

---

### 12. Implement CDN
**Setup Cloudflare:**

1. Add domain to Cloudflare
2. Update DNS nameservers
3. Configure caching rules:

```
# Cache static assets
/assets/* - Cache for 1 year
/images/* - Cache for 1 year
/*.jpg, /*.png, /*.svg - Cache for 1 month

# Cache API responses
/api/* - Cache for 5 minutes with bypass on cookie
```

4. Enable features:
- Auto minify (JS, CSS, HTML)
- Brotli compression
- HTTP/3
- Early Hints

**Time:** 2 hours
**Cost:** Free tier sufficient
**Impact:**
- Global response time: 500ms → 50ms
- Bandwidth savings: 60%
- DDoS protection included

---

## 📆 QUARTER 1 - MEDIUM PRIORITY (P2)

### 13. Refactor Large Components
**Target components >200 lines:**

**HomePage.tsx (312 lines) → Break into:**
- `ArticleList.tsx` - Grid of articles
- `SearchFilters.tsx` - Search and category filters
- `PaginationControls.tsx` - Pagination logic

**CommentsSection.tsx (534 lines) → Break into:**
- `CommentsList.tsx` - List rendering
- `CommentItem.tsx` - Individual comment
- `CommentForm.tsx` - New comment form
- `EmojiPicker.tsx` - Emoji selection

**Time:** 1 week
**Impact:** Easier maintenance, better testing

---

### 14. Extract Custom Hooks
**Create reusable hooks:**

```typescript
// src/hooks/useArticles.ts
export function useArticles(options: {
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['articles', options],
    queryFn: () => fetchArticles(options),
  });
}

// src/hooks/useComments.ts
export function useComments(contentId: string) {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${contentId}`)
      .on('postgres_changes', { ... })
      .subscribe();

    return () => channel.unsubscribe();
  }, [contentId]);

  return useQuery({
    queryKey: ['comments', contentId],
    queryFn: () => fetchComments(contentId),
  });
}

// src/hooks/useAuth.ts
// Move auth logic from AuthContext to hook
```

**Time:** 3 days
**Impact:** Reusable logic, easier testing

---

### 15. Add Composite Database Indexes
**Current Issue:** Missing indexes for common query patterns

```sql
-- Add covering indexes for frequent queries
CREATE INDEX idx_media_content_category_published
  ON media_content(category_id, published_at DESC, is_trending)
  WHERE is_featured = false;

CREATE INDEX idx_media_content_search
  ON media_content(published_at DESC)
  WHERE search_vector IS NOT NULL;

CREATE INDEX idx_comments_content_created
  ON comments(content_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Add partial indexes for filtered queries
CREATE INDEX idx_active_ads
  ON advertisements(placement, is_active)
  WHERE is_active = true
    AND end_date > now();
```

**Time:** 2 hours
**Impact:** Query time: 200ms → 20ms

---

### 16. Implement Table Partitioning
**Setup monthly partitions on media_content:**

```sql
-- Convert to partitioned table
CREATE TABLE media_content_partitioned (
  LIKE media_content INCLUDING ALL
) PARTITION BY RANGE (published_at);

-- Create partitions for each month
CREATE TABLE media_content_2024_01
  PARTITION OF media_content_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE media_content_2024_02
  PARTITION OF media_content_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Auto-create future partitions with pg_partman
CREATE EXTENSION IF NOT EXISTS pg_partman;
```

**Time:** 1 day
**Impact:** Handles 1M+ articles efficiently

---

### 17. Add Service Worker
**Implement offline capability:**

```typescript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('celebud-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/index.css',
        '/assets/index.js',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

```typescript
// src/main.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

**Time:** 1 day
**Impact:** Works offline, faster repeat visits

---

### 18. Optimize Bundle Size
**Add bundle analyzer:**

```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
    }),
  ],
};
```

**Optimization steps:**
1. Lazy load heavy components (AdRevenueReport, EditorialDashboard)
2. Tree-shake unused Lucide icons
3. Replace date-fns with day.js (smaller)
4. Enable gzip/brotli compression

**Time:** 1 day
**Impact:** Bundle size: 310KB → 180KB

---

## 🔮 FUTURE (P3)

### 19. Add E2E Tests
```bash
npm install -D @playwright/test
```

### 20. Implement Analytics
```typescript
import { Analytics } from '@vercel/analytics/react';
```

### 21. Add PWA Features
- Push notifications
- Add to home screen
- Background sync

### 22. Create Mobile App
- React Native setup
- Share code with web

### 23. A/B Testing
- Optimize conversion rates
- Test different layouts

---

## 📊 Success Metrics

### Week 1 Goals:
- ✅ Stripe key secured
- ✅ Page load < 2 seconds
- ✅ Error tracking live
- ✅ Rate limiting active

### Month 1 Goals:
- ✅ Zero N+1 queries
- ✅ 95% cache hit rate
- ✅ Memory leaks fixed
- ✅ Database queries < 50ms

### Quarter 1 Goals:
- ✅ Support 10K concurrent users
- ✅ 99.9% uptime
- ✅ Infrastructure costs < $1K/month
- ✅ All P2 items complete

---

## 💸 Budget Estimate

### Immediate (Week 1):
- Engineering time: 16 hours × $100/hr = $1,600
- Sentry (monitoring): $0 (free tier)
- **Total: $1,600**

### Month 1 (P1):
- Engineering time: 80 hours × $100/hr = $8,000
- Upstash Redis: $10/month
- Cloudflare Pro: $20/month (optional)
- **Total: $8,030**

### Quarter 1 (P2):
- Engineering time: 160 hours × $100/hr = $16,000
- Infrastructure: $100/month
- **Total: $16,100**

### Grand Total: ~$25,730
**ROI:** Saves $1,200/month in infrastructure costs at scale

---

## 🎯 Final Recommendations

### Do These First (This Week):
1. ✅ Secure Stripe key (30 min)
2. ✅ Fix HomePage N+1 query (2 hours)
3. ✅ Move trending to backend cron (1 hour)
4. ✅ Add Sentry error tracking (1 hour)
5. ✅ Implement rate limiting (3 hours)

### Next Month:
6. Add React Query + Redis caching
7. Optimize React components
8. Fix memory leaks
9. Implement queue system

### This Quarter:
10. Refactor large components
11. Add database optimizations
12. Implement CDN
13. Create monitoring dashboard

---

## 📞 Need Help?

**Questions about implementation?**
- Review code examples in this document
- Check Supabase docs: supabase.com/docs
- React Query docs: tanstack.com/query

**Ready to scale? Start with Week 1 tasks!** 🚀
