// Shared helpers for the article `content` column, which holds two formats:
//   - legacy: plain text, paragraphs separated by a single newline, with
//     `[IMAGE:url]` marker lines for inline images (everything published
//     before the rich text editor existed)
//   - current: real HTML produced by the TipTap-based RichTextEditor
// A value is treated as HTML if it starts with a tag — real HTML content
// always does (`<p>`, `<h2>`, etc.), and legacy plain text essentially
// never does (a stray `[IMAGE:...]` marker starts with `[`, not `<`).
export function isHtmlContent(content: string): boolean {
  return /^\s*</.test(content || '');
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
