// Shared helpers for the article `content` column, which holds two formats:
//   - legacy: plain text, paragraphs separated by a single newline, with
//     `[IMAGE:url]` marker lines for inline images (everything published
//     before the rich text editor existed)
//   - current: real HTML produced by the RichTextEditor
// A value is treated as HTML if it contains any of the editor's own tags
// anywhere in the string — not just at the very start. The editor's
// contentEditable div can emit a leading bare text node before a table or
// image is inserted mid-article (e.g. the writer types a sentence, then
// inserts a table), so `content` doesn't always start with `<`; checking
// only the start previously caused that HTML to be misdetected as legacy
// plain text and stripped by sanitizeArticleContent's tag-removal, which is
// why inserted tables/images silently disappeared on the article page.
const HTML_TAG_PATTERN = /<(p|br|strong|b|em|i|u|s|a|h[2-4]|ul|ol|li|blockquote|hr|img|table|thead|tbody|tr|th|td)\b/i;

export function isHtmlContent(content: string): boolean {
  return HTML_TAG_PATTERN.test(content || '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Converts legacy plain-text content (including `[IMAGE:url]` markers) into
// real HTML, so old articles can be opened in the rich text editor and
// rendered through the same HTML path as new ones.
export function legacyPlainTextToHtml(content: string): string {
  return (content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('[IMAGE:') && line.endsWith(']')) {
        const url = line.slice('[IMAGE:'.length, -1);
        return `<img src="${escapeHtml(url)}" alt="" />`;
      }
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('');
}

// What the rich text editor should load for a given stored content value,
// whichever format it's actually in.
export function toEditableHtml(content: string): string {
  const raw = content || '';
  return isHtmlContent(raw) ? raw : legacyPlainTextToHtml(raw);
}
