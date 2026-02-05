
import React, { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  FORMAT_TEXT_COMMAND, 
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  EditorState
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode, HeadingTagType } from '@lexical/rich-text';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';

const theme = {
  paragraph: 'mb-2',
  quote: 'border-l-4 border-gray-300 pl-4 italic my-2',
  heading: {
    h1: 'text-2xl font-bold mb-2',
    h2: 'text-xl font-bold mb-2',
    h3: 'text-lg font-bold mb-2',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal ml-4 mb-2',
    ul: 'list-disc ml-4 mb-2',
    listitem: 'mb-1',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-gray-100 px-1 py-0.5 rounded font-mono text-sm',
  },
};

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const formatHeading = (headingSize: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
      <button
        onClick={() => formatHeading('h2')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Heading"
      >
        <i className="ri-h-2 text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Bold"
      >
        <i className="ri-bold text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Italic"
      >
        <i className="ri-italic text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Underline"
      >
        <i className="ri-underline text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Strikethrough"
      >
        <i className="ri-strikethrough text-gray-600"></i>
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1"></div>
      <button
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Bullet List"
      >
        <i className="ri-list-unordered text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Numbered List"
      >
        <i className="ri-list-ordered text-gray-600"></i>
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1"></div>
      <button
        onClick={() => formatQuote()}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Quote"
      >
        <i className="ri-double-quotes-l text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Code"
      >
        <i className="ri-code-line text-gray-600"></i>
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1"></div>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Align Left"
      >
        <i className="ri-align-left text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Align Center"
      >
        <i className="ri-align-center text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Align Right"
      >
        <i className="ri-align-right text-gray-600"></i>
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1"></div>
      <button
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Undo"
      >
        <i className="ri-arrow-go-back-line text-gray-600"></i>
      </button>
      <button
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
        type="button"
        title="Redo"
      >
        <i className="ri-arrow-go-forward-line text-gray-600"></i>
      </button>
    </div>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Enter text...' }: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'SessionLogEditor',
    theme,
    onError: (error: Error) => {
      console.error(error);
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  };

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      const json = editorState.toJSON();
      onChange(JSON.stringify(json));
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="border border-gray-300 rounded-lg">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="min-h-[200px] p-4 outline-none" 
                style={{ 
                  WebkitUserModify: 'read-write-plaintext-only',
                  imeMode: 'active'
                } as any}
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <OnChangePlugin onChange={handleChange} />
    </LexicalComposer>
  );
}
