import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Table as TableIcon, Image as ImageIcon, Link as LinkIcon,
  Rows3, Columns3, Trash2, Minus,
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

function Toolbar({ editor, folder }: { editor: Editor; folder: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      editor.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const insertLink = () => {
    const url = window.prompt('Link URL:');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const inTable = editor.isActive('table');

  return (
    <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Insert link" active={editor.isActive('link')} onClick={insertLink}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton
          title="Insert table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>
        {inTable && (
          <>
            <ToolbarButton title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <Rows3 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <Columns3 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
              <Minus className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 className="w-4 h-4" />
            </ToolbarButton>
          </>
        )}

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
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
      Placeholder.configure({ placeholder: placeholder || 'Write or paste your article here...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'article-rich-content min-h-[260px] px-4 py-3 focus:outline-none',
      },
    },
  });

  // Sync external changes (opening an existing article, or an AI-generated
  // draft landing) into the editor without disrupting the cursor while
  // the user is actively typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
      <Toolbar editor={editor} folder="article-content" />
      <EditorContent editor={editor} />
      <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
        Tables paste in correctly from Word. Photos usually don't survive copy-paste — use the image button above instead.
      </p>
    </div>
  );
}
