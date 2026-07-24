// Converts a pasted video URL (YouTube, Vimeo, TikTok) into an embeddable
// iframe URL so the video plays inline on the site. Returns null for URLs we
// can't reliably embed — the caller then falls back to a "watch on source"
// link.

export function getVideoEmbedUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // TikTok
  const tiktok = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|embed\/(?:v2\/)?|v\/)(\d+)/i);
  if (tiktok) return `https://www.tiktok.com/embed/v2/${tiktok[1]}`;

  return null;
}

// Best-effort thumbnail from a video URL (YouTube only — its thumbnails are
// public and predictable). Handy for auto-filling an article thumbnail.
export function getVideoThumbnail(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const yt = rawUrl.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}

export function isEmbeddableVideoUrl(rawUrl: string | null | undefined): boolean {
  return getVideoEmbedUrl(rawUrl) !== null;
}
