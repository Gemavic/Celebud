// Shared plumbing for the Newsroom tools (/admin/newsroom).
import { supabase } from '../../lib/supabase';
import { slugify } from '../../utils/articleUrl';

export interface Draft {
  title: string;
  description: string;
  seo_keywords: string;
  content: string;
}

async function authedPost(fn: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in as an admin.');
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false || data.error) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

/** Calls one action of the newsroom-ai edge function. */
export function newsroomAI<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  return authedPost('newsroom-ai', { action, ...payload }) as Promise<T>;
}

/** Rewrites one fetched story into a hidden draft (same path as Article Management). */
export function rewriteAsDraft(id: string) {
  return authedPost('enrich-articles', { ids: [id], withImages: false });
}

/**
 * Saves AI-assisted material as a HIDDEN draft article. It is newsroom work
 * (is_manual) and never goes live from here — the editor opens it in
 * Article Management, checks it, and saving there publishes it.
 */
export async function createDraftArticle(
  draft: Draft,
  opts: { categorySlug?: string; thumbnailUrl?: string | null } = {},
): Promise<string> {
  let categoryId: string | null = null;
  if (opts.categorySlug) {
    const { data } = await supabase.from('categories').select('id').eq('slug', opts.categorySlug).maybeSingle();
    categoryId = data?.id ?? null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  // Titles and slugs are unique site-wide, so a second digest or a repeated
  // headline gets " (2)", " (3)"… — the editor can retitle before saving.
  for (let n = 1; n <= 5; n++) {
    const title = n === 1 ? draft.title : `${draft.title} (${n})`;
    const { data, error } = await insertDraft(title);
    if (!error) return data!.id as string;
    if (error.code !== '23505') throw error;
  }
  throw new Error('A draft with this title already exists several times — rename it and try again.');

  async function insertDraft(title: string) {
   return supabase
    .from('media_content')
    .insert({
      title,
      slug: slugify(title),
      description: draft.description || null,
      content: draft.content,
      seo_title: draft.title.slice(0, 60),
      seo_keywords: draft.seo_keywords || null,
      thumbnail_url: opts.thumbnailUrl || null,
      category_id: categoryId,
      media_type: 'article',
      is_manual: true,
      is_published: false,
      saved_by: user?.id ?? null,
      published_at: new Date().toISOString(),
      views_count: 0,
      comments_count: 0,
    })
    .select('id')
    .single();
  }
}

export const editLink = (id: string) => `/admin/articles?edit=${id}`;

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export const btn = 'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50';
export const btnPrimary = `${btn} bg-red-600 text-white hover:bg-red-700`;
export const btnSecondary = `${btn} bg-white text-gray-800 border border-gray-300 hover:bg-gray-50`;
export const input = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent';
export const card = 'bg-white rounded-xl border border-gray-200 p-5';
