const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr',
  'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'target', 'rel', 'class']);

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

  const newEl = doc.createElement(tagName);

  for (const attr of Array.from(el.attributes)) {
    if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) continue;
    const val = attr.value;
    if (attr.name === 'href' || attr.name === 'src') {
      if (val.startsWith('javascript:') || val.startsWith('data:text')) continue;
    }
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
