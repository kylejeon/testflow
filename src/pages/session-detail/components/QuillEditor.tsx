import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect } from 'react';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function TipTapEditor({ value, onChange, placeholder = 'Enter text...' }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Heading"
        >
          <i className="ri-h-2 text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('bold') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Bold"
        >
          <i className="ri-bold text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('italic') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Italic"
        >
          <i className="ri-italic text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('underline') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Underline"
        >
          <i className="ri-underline text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('strike') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Strikethrough"
        >
          <i className="ri-strikethrough text-gray-600"></i>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('bulletList') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Bullet List"
        >
          <i className="ri-list-unordered text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('orderedList') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Numbered List"
        >
          <i className="ri-list-ordered text-gray-600"></i>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('blockquote') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Quote"
        >
          <i className="ri-double-quotes-l text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive('codeBlock') ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Code Block"
        >
          <i className="ri-code-box-line text-gray-600"></i>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Align Left"
        >
          <i className="ri-align-left text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Align Center"
        >
          <i className="ri-align-center text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''
          }`}
          type="button"
          title="Align Right"
        >
          <i className="ri-align-right text-gray-600"></i>
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          title="Undo"
        >
          <i className="ri-arrow-go-back-line text-gray-600"></i>
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          title="Redo"
        >
          <i className="ri-arrow-go-forward-line text-gray-600"></i>
        </button>
      </div>
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror {
          min-height: 200px;
          padding: 1rem;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror p {
          margin-bottom: 0.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin-bottom: 0.25rem;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1rem;
          font-style: italic;
          margin: 0.5rem 0;
        }
        .ProseMirror pre {
          background-color: #f3f4f6;
          padding: 0.75rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          margin: 0.5rem 0;
        }
        .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.875rem;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: '${placeholder}';
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          float: left;
        }
      `}</style>
    </div>
  );
}
