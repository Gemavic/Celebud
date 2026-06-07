import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
};

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "12", 10);
    const search = url.searchParams.get("search") || "";

    const cacheKey = `hp:${category}:${page}:${pageSize}:${search}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;

    // Run all queries in parallel
    const [categoriesRes, featuredRes, trendingRes, articlesRes, editorialRes] =
      await Promise.all([
        // 1. Categories (only CelebUD categories with display_order > 0)
        supabase.from("categories").select("*").gt("display_order", 0).order("display_order"),

        // 2. Featured articles (top 3)
        supabase
          .from("media_content")
          .select("*, categories(*), authors(*)")
          .eq("is_featured", true)
          .gte("published_at", thirtyDaysAgo)
          .order("published_at", { ascending: false })
          .limit(3),

        // 3. Trending articles (top 6)
        supabase
          .from("media_content")
          .select("*, categories(*), authors(*)")
          .eq("is_trending", true)
          .gte("published_at", thirtyDaysAgo)
          .order("views_count", { ascending: false })
          .limit(6),

        // 4. Main articles list (with optional category filter or search)
        search
          ? supabase
              .from("media_content")
              .select("*, categories(*), authors(*)")
              .or(
                `title.ilike.%${search}%,description.ilike.%${search}%`
              )
              .order("published_at", { ascending: false })
              .limit(20)
          : (() => {
              let q = supabase
                .from("media_content")
                .select(
                  category
                    ? "*, categories!inner(*), authors(*)"
                    : "*, categories(*), authors(*)",
                  { count: "exact" }
                )
                .order("published_at", { ascending: false });
              if (category) {
                q = q.eq("categories.slug", category);
              }
              return q.range(startIndex, endIndex);
            })(),

        // 5. Editorial features
        supabase
          .from("editorial_features")
          .select(
            `*, media_content:content_id (title, slug, thumbnail_url, description, published_at, authors (*), categories (*))`
          )
          .eq("is_active", true)
          .gte("end_date", new Date().toISOString())
          .order("priority")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    const result = {
      categories: categoriesRes.data || [],
      featured: featuredRes.data || [],
      trending: trendingRes.data || [],
      articles: articlesRes.data || [],
      articlesCount: articlesRes.count ?? (articlesRes.data?.length || 0),
      editorial: (editorialRes.data || []).map((f: any) => ({
        ...f,
        discussion_count: 0,
        days_remaining: f.end_date
          ? Math.ceil(
              (new Date(f.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : null,
      })),
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Evict oldest entries if cache grows too large
    if (cache.size > 50) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("homepage-data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
