import { useRef, useState, useCallback } from 'react';
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Table as TableIcon, Image as ImageIcon, Link as LinkIcon,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

function Toolbar({ editorRef, folder, onContentChange }: { editorRef: React.RefObject<HTMLDivElement | null>; folder: string; onContentChange: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    onContentChange();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${folder}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from('media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('media').getPublicUrl(path);
      exec('insertHTML', `<img src="${data.publicUrl}" alt="${file.name}" class="rounded-lg max-w-full h-auto" />`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
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

  const clearFormatting = () => {
    exec('removeFormat');
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        <ToolbarButton title="Bold" onClick={() => exec('bold')}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => exec('italic')}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Heading" onClick={() => exec('formatBlock', 'h2')}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Subheading" onClick={() => exec('formatBlock', 'h3')}>
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={() => exec('insertUnorderedList')}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" onClick={() => exec('insertOrderedList')}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Insert link" onClick={insertLink}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton title="Insert table" onClick={insertTable}>
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton title="Clear formatting" onClick={clearFormatting}>
          <Trash2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton title="Insert image" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {uploading && <span className="text-xs text-gray-500 ml-1">Uploading...</span>}
      </div>
      {uploadError && <p className="px-2 pb-1.5 text-xs text-red-600">{uploadError}</p>}
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange(editorRef.current.innerHTML);
    isInternalChange.current = false;
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, html || text);
    handleInput();
  }, [handleInput]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
      <Toolbar editorRef={editorRef} folder="article-content" onContentChange={handleInput} />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="article-rich-content min-h-[260px] px-4 py-3 focus:outline-none"
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        data-placeholder={placeholder || 'Write or paste your article here...'}
      />
      <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
        Tables paste in correctly from Word. Photos usually don't survive copy-paste — use the image button above instead.
      </p>
    </div>
  );
}
