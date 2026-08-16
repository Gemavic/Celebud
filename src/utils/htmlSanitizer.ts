const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr',
  'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'target', 'rel', 'class']);

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

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = doc.createDocumentFragment();
    for (const child of Array.from(el.childNodes)) {
      const cleaned = sanitizeNode(child, doc);
      if (cleaned) fragment.appendChild(cleaned);
    }
    return fragment;
  }

  // An <img> is nothing but its src — a blocked/missing one means there is
  // no image, so the tag is dropped entirely rather than kept empty (which
  // rendered as a bare broken-image icon with its alt text floating next to
  // it, exactly what showed up in the reported article).
  if (tagName === 'img') {
    const src = el.getAttribute('src') || '';
    if (!src || isBlockedUrl(src)) return null;
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
