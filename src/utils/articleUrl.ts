// src/utils/articleUrl.ts
//
// Builds SEO-friendly article URLs using the `slug` column that already
// exists on media_content but wasn't being used. URLs stay backward
// compatible: /article/:id keeps working on its own (the id is always
// the source of truth for lookups), the slug is just appended for
// readability and a modest ranking/CTR signal.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function buildArticleUrl(article: { id: string; slug?: string | null; title?: string | null }): string {
  const slug = article.slug?.trim() || (article.title ? slugify(article.title) : '');
  return slug ? `/article/${article.id}/${slug}` : `/article/${article.id}`;
}
