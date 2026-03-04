
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  projectId?: string;
}

export default function TipTapEditor({ value, onChange, placeholder = 'Enter text...', projectId }: TipTapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-2 cursor-pointer',
          style: 'max-height: 400px; object-fit: contain;',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      setUploadingImage(true);

      if (projectId) {
        // Supabase Storage에 업로드
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${projectId}/testcases/inline/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('test-case-attachments')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('test-case-attachments')
          .getPublicUrl(filePath);

        editor.chain().focus().setImage({ src: urlData.publicUrl, alt: file.name }).run();
      } else {
        // projectId 없을 경우 base64로 삽입
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target?.result as string;
          if (src) {
            editor.chain().focus().setImage({ src, alt: file.name }).run();
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

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
        {/* 이미지 업로드 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          title="이미지 첨부"
        >
          {uploadingImage ? (
            <i className="ri-loader-4-line animate-spin text-gray-600"></i>
          ) : (
            <i className="ri-image-add-line text-gray-600"></i>
          )}
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
          min-height: 80px;
          padding: 0.75rem;
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
        .ProseMirror img {
          max-width: 100%;
          border-radius: 0.5rem;
          margin: 0.5rem 0;
          max-height: 400px;
          object-fit: contain;
          cursor: pointer;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          float: left;
        }
      `}</style>
    </div>
  );
}
