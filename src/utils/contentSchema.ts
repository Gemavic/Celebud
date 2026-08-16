// src/utils/contentSchema.ts
//
// The single, shared definition of what an article body may contain.
// htmlSanitizer.ts (paste-time and render-time) and articleCompliance.ts
// (the publish gate) each used to keep their own copy of this list — a
// classic way for two "same rule" checks to quietly drift apart, exactly
// the kind of bug this whole session has been about closing. Both now
// import from here instead.

export const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr',
  'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  // Media. video/audio/source are the site's own uploaded files, served
  // from Supabase storage like an <img> already is. iframe is ONLY ever
  // produced by getVideoEmbedUrl() (youtube.com/player.vimeo.com/
  // tiktok.com — nothing else), never from a raw pasted URL, and its src
  // is re-validated against that same allowlist at sanitize time — an
  // iframe is a much bigger risk than an <img> (it can load any page, not
  // just an image), so it does not get the general "any http(s) URL is
  // fine" treatment the other tags get.
  'video', 'audio', 'source', 'iframe',
]);

export const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'target', 'rel', 'class',
  // video/audio
  'controls', 'poster', 'preload', 'type',
  // iframe (YouTube/Vimeo/TikTok embeds)
  'allow', 'allowfullscreen', 'frameborder', 'width', 'height', 'title',
]);

/** Hosts getVideoEmbedUrl() is allowed to point an <iframe> at — nothing else. */
export const ALLOWED_IFRAME_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'www.tiktok.com',
]);
