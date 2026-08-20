/**
 * Single source of truth for image fallbacks.
 *
 * Why this exists: several components used `src={someUrl || ''}`. An empty
 * src is not "no image" to a browser -- it re-requests the CURRENT PAGE URL,
 * gets index.html back, and renders a broken-image icon. Because the SPA
 * catch-all rewrite answers 200 (not 404), onError never fires either, so
 * the failure is silent and permanent.
 *
 * Use FALLBACK_AVATAR / FALLBACK_THUMBNAIL as the `||` right-hand side, and
 * attach handleImageError as onError so a dead remote URL degrades to the
 * placeholder instead of a broken icon.
 */

// Local files that genuinely exist in public/ -- no external dependency,
// no extra network hop, and they survive the asset-guard rewrite.
export const FALLBACK_AVATAR = '/logo-badge.png';
export const FALLBACK_THUMBNAIL = '/logo.jpg';

/**
 * onError handler. Swaps in the placeholder exactly once -- the guard on
 * dataset.fallbackApplied stops an infinite error loop if the placeholder
 * itself ever fails to load.
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = FALLBACK_THUMBNAIL
): void {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  img.src = fallback;
}
