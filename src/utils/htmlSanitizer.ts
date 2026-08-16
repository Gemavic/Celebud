import { ALLOWED_TAGS, ALLOWED_ATTRS, ALLOWED_IFRAME_HOSTS } from './contentSchema';

// Schemes that can never be a real, shareable image or link — kept as a list
// so the reason for rejecting each is explicit, not inferred from a pattern.
//   javascript: / vbscript: — script injection
//   data:                   — works today, breaks tomorrow: bloats the row
//                             with the whole image as text, and CelebUD
//                             already has a real upload path for images
//   blob:  — this is the specific bug that shipped a broken article: an
//            image copied out of an AI chat tool's page (Gemini, ChatGPT)
//            carries a URL like blob:https://gemini.google.com/<id>. It
//            only ever resolves inside the browser tab that created it —
//            not for any other reader, not even the same person tomorrow.
//            It LOOKED like a real URL at paste time, which is exactly why
//            it reached a published article undetected.
//   file:  — a path on the writer's own computer, meaningless to anyone else
const BLOCKED_URL_SCHEMES = ['javascript:', 'vbscript:', 'data:', 'blob:', 'file:'];

function isBlockedUrl(val: string): boolean {
  const normalized = val.trim().toLowerCase();
  return BLOCKED_URL_SCHEMES.some((scheme) => normalized.startsWith(scheme));
}

/**
 * An <iframe> can load any page, not just an image — a much bigger risk
 * than the other tags here, so it doesn't get the general "any http(s) URL
 * is fine" treatment. Only a src matching getVideoEmbedUrl()'s own output
 * (youtube.com/player.vimeo.com/tiktok.com) is accepted; anything else,
 * including a scheme-valid https:// URL to some other site, is rejected.
 */
function isAllowedIframeSrc(val: string): boolean {
  try {
    const url = new URL(val, 'https://placeholder.invalid');
    return url.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Tags whose *content* is never real article text — a stylesheet, a
// script, or (via the colon check below) a Word-paste namespace block —
// get dropped whole, tag and children together. The generic "unknown tag"
// path below unwraps and keeps a tag's children, which is right for
// something like a stray <div> wrapping real paragraphs, but wrong here:
// a <style> tag's "child" is a text node full of CSS, and unwrapping it
// would dump that CSS onto the page as visible text. Real example this
// closes: a Word paste that arrives with a multi-KB <style> block and a
// <xml> block full of <o:...>/<w:...>/<m:...> config elements — Word's
// own namespaced markup, never article content.
const DROP_WHOLE_TAGS = new Set(['style', 'script', 'head', 'title', 'meta', 'link', 'xml']);

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  // Namespaced elements (o:p, w:worddocument, m:mathpr, …) — the HTML
  // parser doesn't understand XML namespaces, so these arrive as literal
  // tag names containing a colon. Always Word-paste metadata, never
  // content a reader should see.
  if (tagName.includes(':') || DROP_WHOLE_TAGS.has(tagName)) return null;

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = doc.createDocumentFragment();
    for (const child of Array.from(el.childNodes)) {
      const cleaned = sanitizeNode(child, doc);
      if (cleaned) fragment.appendChild(cleaned);
    }
    return fragment;
  }

  // A media tag is nothing but its src — a blocked/missing one means there
  // is no media, so the tag is dropped entirely rather than kept empty
  // (which for <img> rendered as a bare broken-image icon with its alt text
  // floating next to it, exactly what showed up in a reported article).
  if (tagName === 'img' || tagName === 'video' || tagName === 'audio' || tagName === 'source') {
    const src = el.getAttribute('src') || '';
    if (!src || isBlockedUrl(src)) return null;
  }
  if (tagName === 'iframe') {
    const src = el.getAttribute('src') || '';
    if (!isAllowedIframeSrc(src)) return null;
  }

  const newEl = doc.createElement(tagName);

  for (const attr of Array.from(el.attributes)) {
    if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) continue;
    const val = attr.value;
    // A blocked href just loses the link, not the visible text — someone
    // pasting "click here" with a bad link should keep reading "click here",
    // not disappear along with it.
    if ((attr.name === 'href' || attr.name === 'src') && isBlockedUrl(val)) continue;
    newEl.setAttribute(attr.name, val);
  }

  // video/audio need controls to be playable at all, and only ever come
  // from this site's own upload — always on, not left to whatever the
  // pasted/dragged markup happened to include.
  if (tagName === 'video' || tagName === 'audio') {
    newEl.setAttribute('controls', '');
  }

  for (const child of Array.from(el.childNodes)) {
    const cleaned = sanitizeNode(child, doc);
    if (cleaned) newEl.appendChild(cleaned);
  }

  return newEl;
}

export function sanitizeHtml(dirty: string): string {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(dirty, 'text/html');
  const doc = document.implementation.createHTMLDocument('');
  const container = doc.createElement('div');

  for (const child of Array.from(parsed.body.childNodes)) {
    const cleaned = sanitizeNode(child, doc);
    if (cleaned) container.appendChild(cleaned);
  }

  return container.innerHTML;
}
