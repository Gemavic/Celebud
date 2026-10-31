import { useRef, useState, useCallback } from 'react';
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Table as TableIcon, Image as ImageIcon, Link as LinkIcon,
  Trash2, Video as VideoIcon, Music,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitizeHtml } from '../utils/htmlSanitizer';
import { getVideoEmbedUrl } from '../utils/videoEmbed';
import { newsroomAI } from './newsroom/shared';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Media helpers. Every picture, video or audio file that ends up in an
// article — from the toolbar, a paste, or a drag-and-drop — goes through the
// same path: stored in CelebUD's own "media" bucket, then inserted as a
// normal tag. Nothing is ever left pointing at the writer's computer, an AI
// chat tab (blob:) or a giant data: string.

type Kind = 'image' | 'video' | 'audio';
const MAX_MB = 50;
const WEB_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const PENDING = 'https://upload.pending.invalid/';

function kindOf(file: File): Kind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return null;
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function mediaHtml(kind: Kind, url: string, name: string) {
  if (kind === 'video') return `<video controls src="${esc(url)}" class="w-full rounded-lg"></video>`;
  if (kind === 'audio') return `<audio controls src="${esc(url)}" class="w-full"></audio>`;
  const alt = name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
  return `<img src="${esc(url)}" alt="${esc(alt)}" class="rounded-lg max-w-full h-auto" />`;
}

/** Phone photos are often 4–10 MB (or HEIC on iPhone): shrink to a web-sized JPEG. */
async function prepareImage(file: File): Promise<File> {
  const fine = WEB_IMAGE.includes(file.type) && file.size <= 1.5 * 1024 * 1024;
  if (fine || file.type === 'image/gif') return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    if (WEB_IMAGE.includes(file.type)) return file;
    throw new Error(`“${file.name}” is in a format browsers can't show (often HEIC from an iPhone). Save it as JPEG or PNG and try again.`);
  }
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, '') + '.jpg', { type: 'image/jpeg' });
}

async function uploadMedia(file: File, folder: string): Promise<{ kind: Kind; url: string; name: string }> {
  const kind = kindOf(file);
  if (!kind) throw new Error(`“${file.name}” isn't a picture, video or audio file.`);
  const ready = kind === 'image' ? await prepareImage(file) : file;
  if (ready.size > MAX_MB * 1024 * 1024) {
    throw new Error(kind === 'video'
      ? `“${file.name}” is over ${MAX_MB} MB. Upload long videos to YouTube or TikTok and paste the link instead.`
      : `“${file.name}” is over ${MAX_MB} MB.`);
  }
  const safeName = ready.name.replace(/[^a-zA-Z0-9._-]/g, '_') || `${kind}`;
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
  const { error } = await supabase.storage.from('media').upload(path, ready, {
    cacheControl: '31536000', upsert: false, contentType: ready.type || undefined,
  });
  if (error) {
    if (/mime|type/i.test(error.message)) throw new Error(`“${file.name}” is a file type the site can't play. Use JPG/PNG/WebP photos, MP4 video or MP3/M4A audio.`);
    throw new Error(error.message);
  }
  return { kind, url: supabase.storage.from('media').getPublicUrl(path).data.publicUrl, name: file.name };
}

const ownStorageHost = (() => {
  try { return new URL(import.meta.env.VITE_SUPABASE_URL).host; } catch { return ''; }
})();

function Toolbar({ editorRef, onContentChange, onFiles, onEmbed, busy, error, setError }: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onContentChange: () => void;
  onFiles: (files: File[]) => void;
  onEmbed: (html: string) => void;
  busy: string | null;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    onContentChange();
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) onFiles(files);
  };

  /**
   * Embeds a YouTube/Vimeo/TikTok link inline as a real player. getVideoEmbedUrl
   * is the ONLY source an <iframe> src is ever allowed to come from — the
   * sanitizer re-checks that at save time too.
   */
  const insertVideoLink = () => {
    const url = window.prompt('Paste a YouTube, Vimeo or TikTok link — or leave empty to upload a video file:');
    if (url === null) return;
    if (!url.trim()) { videoFileInputRef.current?.click(); return; }
    const embedUrl = getVideoEmbedUrl(url.trim());
    if (!embedUrl) {
      setError("That link isn't from YouTube, Vimeo or TikTok — upload a video file instead, or paste it as a plain link.");
      return;
    }
    setError(null);
    onEmbed(embedHtml(embedUrl));
  };

  const insertLink = () => {
    const url = window.prompt('Link URL:');
    if (!url) return;
    exec('createLink', url);
  };

  const insertTable = () => {
    const html = `<table class="border-collapse w-full my-2"><thead><tr><th class="border p-2">Header</th><th class="border p-2">Header</th><th class="border p-2">Header</th></tr></thead><tbody><tr><td class="border p-2"></td><td class="border p-2"></td><td class="border p-2"></td></tr><tr><td class="border p-2"></td><td class="border p-2"></td><td class="border p-2"></td></tr></tbody></table><p></p>`;
    exec('insertHTML', html);
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        <ToolbarButton title="Bold" onClick={() => exec('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => exec('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Heading" onClick={() => exec('formatBlock', 'h2')}><Heading2 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Subheading" onClick={() => exec('formatBlock', 'h3')}><Heading3 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={() => exec('insertUnorderedList')}><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Insert link" onClick={insertLink}><LinkIcon className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton title="Insert table" onClick={insertTable}><TableIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton title="Clear formatting" onClick={() => exec('removeFormat')}><Trash2 className="w-4 h-4" /></ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton title="Insert photo(s) — or just paste / drag them into the text" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />

        <ToolbarButton title="Insert video (YouTube/Vimeo/TikTok link, or upload a file up to 50 MB)" onClick={insertVideoLink}>
          <VideoIcon className="w-4 h-4" />
        </ToolbarButton>
        <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden" onChange={pick} />

        <ToolbarButton title="Insert audio file" onClick={() => audioFileInputRef.current?.click()}>
          <Music className="w-4 h-4" />
        </ToolbarButton>
        <input ref={audioFileInputRef} type="file" accept="audio/*" className="hidden" onChange={pick} />

        {busy && <span className="text-xs text-blue-700 ml-1 animate-pulse">{busy}</span>}
      </div>
      {error && <p className="px-2 pb-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const embedHtml = (embedUrl: string) =>
  `<iframe src="${esc(embedUrl)}" width="100%" height="360" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="Embedded video"></iframe>`;

const IMAGE_URL = /^https?:\/\/\S+\.(jpe?g|png|webp|gif|avif)(\?\S*)?$/i;

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastRange = useRef<Range | null>(null);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange(editorRef.current.innerHTML);
    isInternalChange.current = false;
  }, [onChange]);

  // Remember where the cursor was, so a toolbar click (which takes focus)
  // still inserts the picture where the writer was typing.
  const rememberCaret = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      lastRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const insertHtmlAtCaret = useCallback((html: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = window.getSelection();
    const inside = sel && sel.rangeCount && ed.contains(sel.anchorNode);
    if (!inside) {
      ed.focus();
      if (lastRange.current && sel) { sel.removeAllRanges(); sel.addRange(lastRange.current); }
      else if (sel) { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
    }
    document.execCommand('insertHTML', false, html);
    rememberCaret();
    handleInput();
  }, [handleInput, rememberCaret]);

  /** Swap every element matching `selector` once its upload finishes. */
  const replaceIn = useCallback((selector: string, html: string | null) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.querySelectorAll(selector).forEach((el) => {
      if (html === null) el.remove();
      else el.outerHTML = html;
    });
    handleInput();
  }, [handleInput]);

  const uploadFiles = useCallback((files: File[]) => {
    const usable = files.filter((f) => kindOf(f));
    if (!usable.length) { setError('Only pictures, videos and audio files can go into an article.'); return; }
    setError(null);
    // Placeholders go in straight away, in order, at the cursor; each is
    // swapped for the real picture/video as soon as its upload finishes.
    const ids = usable.map(() => `up${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`);
    insertHtmlAtCaret(ids.map((id, i) =>
      `<p><img src="${PENDING}${id}" alt="Uploading ${esc(usable[i].name)}…" class="rounded-lg max-w-full h-auto opacity-40" /></p>`).join('') + '<p><br></p>');
    usable.forEach((file, i) => {
      setPending((n) => n + 1);
      uploadMedia(file, 'article-content')
        .then(({ kind, url, name }) => replaceIn(`img[src="${PENDING}${ids[i]}"]`, mediaHtml(kind, url, name)))
        .catch((e: unknown) => {
          replaceIn(`img[src="${PENDING}${ids[i]}"]`, null);
          setError(e instanceof Error ? e.message : `“${file.name}” could not be uploaded.`);
        })
        .finally(() => setPending((n) => n - 1));
    });
  }, [insertHtmlAtCaret, replaceIn]);

  /** Copy pictures that live on other websites onto CelebUD's storage. */
  const importRemoteImages = useCallback((srcs: string[]) => {
    for (const src of new Set(srcs)) {
      setPending((n) => n + 1);
      newsroomAI<{ url: string }>('rehost_image', { url: src })
        .then(({ url }) => {
          editorRef.current?.querySelectorAll('img').forEach((img) => { if (img.getAttribute('src') === src) img.setAttribute('src', url); });
          handleInput();
        })
        .catch(() => { /* keep the original link; it still shows */ })
        .finally(() => setPending((n) => n - 1));
    }
  }, [handleInput]);

  /** Shared by paste and drop when there are no files: HTML or plain text. */
  const insertClipboard = useCallback((html: string, text: string) => {
    if (!html) {
      const t = text.trim();
      if (/^https?:\/\/\S+$/.test(t)) {
        const embed = getVideoEmbedUrl(t);
        if (embed) { insertHtmlAtCaret(`<p>${embedHtml(embed)}</p><p><br></p>`); return; }
        if (IMAGE_URL.test(t)) {
          insertHtmlAtCaret(`<p><img src="${esc(t)}" alt="" class="rounded-lg max-w-full h-auto" /></p><p><br></p>`);
          importRemoteImages([t]);
          return;
        }
      }
      document.execCommand('insertText', false, text);
      handleInput();
      return;
    }

    // Pictures embedded in pasted HTML: data: ones are real image bytes we
    // can upload; blob:/file: ones only exist on the writer's machine or in
    // another tab and can't be recovered; http(s) ones are copied over.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const dataFiles: { id: string; file: File }[] = [];
    const remote: string[] = [];
    let lost = 0;
    doc.querySelectorAll('img').forEach((img) => {
      const src = (img.getAttribute('src') || '').trim();
      const m = src.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
      if (m) {
        try {
          const bin = atob(m[2]);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const id = `up${Math.random().toString(36).slice(2, 10)}`;
          dataFiles.push({ id, file: new File([bytes], `pasted-image.${m[1].split('/')[1].replace('+xml', '')}`, { type: m[1] }) });
          img.setAttribute('src', PENDING + id);
          img.setAttribute('class', 'rounded-lg max-w-full h-auto opacity-40');
        } catch { img.remove(); lost++; }
      } else if (/^https?:\/\//i.test(src)) {
        img.setAttribute('class', 'rounded-lg max-w-full h-auto');
        try { if (new URL(src).host !== ownStorageHost) remote.push(src); } catch { /* ignore */ }
      } else {
        img.remove();
        lost++;
      }
    });
    const clean = sanitizeHtml(doc.body.innerHTML);
    if (clean.trim()) insertHtmlAtCaret(clean);
    if (remote.length) importRemoteImages(remote);
    dataFiles.forEach(({ id, file }) => {
      setPending((n) => n + 1);
      uploadMedia(file, 'article-content')
        .then(({ kind, url, name }) => replaceIn(`img[src="${PENDING}${id}"]`, mediaHtml(kind, url, name)))
        .catch(() => { replaceIn(`img[src="${PENDING}${id}"]`, null); lost++; })
        .finally(() => setPending((n) => n - 1));
    });
    if (lost) {
      setError(`${lost} picture${lost === 1 ? '' : 's'} in what you pasted only existed on your computer or inside another app, so ${lost === 1 ? 'it' : 'they'} couldn't come across. Save the picture to your device, then paste it on its own, drag it in, or use the photo button.`);
    }
  }, [handleInput, importRemoteImages, insertHtmlAtCaret, replaceIn]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const files = Array.from(e.clipboardData.files || []).filter((f) => kindOf(f));
    // A screenshot or "Copy image" gives a real file. Word also puts a
    // picture of the whole selection on the clipboard next to the text, so
    // when the paste carries real text, the text (and its pictures) wins.
    const htmlHasText = !!html && (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').trim().length > 0;
    if (files.length && !htmlHasText) { uploadFiles(files); return; }
    // Word, Google Docs and chat apps put a fully-formatted HTML fragment on
    // the clipboard — fonts, spans, Office XML. The sanitizer keeps real
    // formatting (bold, links, tables, pictures) and drops the rest.
    insertClipboard(html, text);
  }, [insertClipboard, uploadFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Put the cursor where the item was dropped.
    const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
    const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
    const sel = window.getSelection();
    if (r && sel) { sel.removeAllRanges(); sel.addRange(r); }

    const files = Array.from(e.dataTransfer.files || []).filter((f) => kindOf(f));
    if (files.length) { uploadFiles(files); return; }
    insertClipboard(e.dataTransfer.getData('text/html'), e.dataTransfer.getData('text/plain'));
  }, [insertClipboard, uploadFiles]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
      <Toolbar
        editorRef={editorRef}
        onContentChange={handleInput}
        onFiles={uploadFiles}
        onEmbed={(h) => insertHtmlAtCaret(`<p>${h}</p><p><br></p>`)}
        busy={pending > 0 ? `Uploading ${pending} file${pending === 1 ? '' : 's'}… keep this window open` : null}
        error={error}
        setError={setError}
      />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="article-rich-content min-h-[260px] px-4 py-3 focus:outline-none"
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onKeyUp={rememberCaret}
        onMouseUp={rememberCaret}
        onBlur={rememberCaret}
        onDragOver={(e) => e.preventDefault()}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        data-placeholder={placeholder || 'Write or paste your article here...'}
      />
      <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
        Paste or drag photos, videos and audio straight into the text — or click where you want one and use the buttons above.
        Paste a YouTube, Vimeo or TikTok link on its own line to embed the player. Photos are resized automatically; videos up to 50 MB
        (longer ones: upload to YouTube and paste the link). Pasting from Word or Google Docs keeps bold, links, tables and pictures.
      </p>
    </div>
  );
}
