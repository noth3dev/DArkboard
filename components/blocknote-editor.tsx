"use client";

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

interface BlockNoteEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export default function BlockNoteEditor({ initialContent, onChange, editable = true }: BlockNoteEditorProps) {
  const getInitialBlocks = (content?: string) => {
    if (!content) return undefined;
    try {
      return JSON.parse(content);
    } catch (e) {
      return [
        {
          type: "paragraph",
          content: [{ type: "text", text: content, styles: {} }],
        },
      ];
    }
  };

  const editor = useCreateBlockNote({
    initialContent: getInitialBlocks(initialContent),
  });

  return (
    <MantineProvider defaultColorScheme="dark">
      <div className={`
        group relative rounded-3xl transition-all duration-500
        ${editable
          ? 'bg-neutral-900/40 border border-neutral-800 focus-within:border-blue-500/50 shadow-2xl focus-within:shadow-blue-500/5'
          : 'bg-transparent border-none'}
        overflow-hidden
      `}>
        <div className={editable ? "p-4 min-h-[400px]" : "p-0"}>
          <BlockNoteView
            editor={editor}
            editable={editable}
            theme="dark"
            className="bn-editor-custom"
            onChange={() => {
              onChange(JSON.stringify(editor.document));
            }}
          />
        </div>
      </div>
      <style jsx global>{`
        .bn-editor-custom {
          background: transparent !important;
        }
        .bn-editor-custom .bn-container {
          background: transparent !important;
          padding-left: 0 !important;
        }
        .bn-editor-custom .bn-editor {
          padding-left: 12px !important;
          padding-right: 12px !important;
          background: transparent !important;
        }
        .bn-editor-custom .bn-block {
          margin-top: 4px !important;
          margin-bottom: 4px !important;
        }
        .bn-editor-custom .bn-block-content {
          color: #e5e5e5 !important;
          font-family: var(--font-pretendard), 'Inter', sans-serif !important;
          line-height: 1.7 !important;
          letter-spacing: -0.01em !important;
        }
        .bn-editor-custom .bn-block-content[data-content-type="heading"][data-level="1"],
        .bn-editor-custom .bn-block-content[data-content-type="heading"][data-level="1"] .bn-inline-content {
          font-size: 2.25rem !important;
          font-weight: 800 !important;
          color: #ffffff !important;
          margin-top: 1rem !important;
          margin-bottom: 0.5rem !important;
          letter-spacing: -0.04em !important;
          line-height: 1.2 !important;
        }
        .bn-editor-custom .bn-block-content[data-content-type="heading"][data-level="2"],
        .bn-editor-custom .bn-block-content[data-content-type="heading"][data-level="2"] .bn-inline-content {
          font-size: 1.6rem !important;
          font-weight: 700 !important;
          color: #ffffff !important;
          margin-top: 0.75rem !important;
          margin-bottom: 0.35rem !important;
          letter-spacing: -0.03em !important;
          line-height: 1.3 !important;
        }
        .bn-editor-custom .bn-block-content[data-content-type="heading"][data-level="3"],
        .bn-editor-custom .bn-block-content[data-content-type="heading"][data-level="3"] .bn-inline-content {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          color: #f5f5f5 !important;
          margin-top: 0.5rem !important;
          margin-bottom: 0.25rem !important;
          letter-spacing: -0.02em !important;
        }
        .bn-editor-custom .bn-block-content[data-content-type="paragraph"] {
          font-size: 15px !important;
          opacity: 0.9;
        }
        /* List Item Styling */
        .bn-editor-custom .bn-block-content[data-content-type="bulletListItem"],
        .bn-editor-custom .bn-block-content[data-content-type="numberedListItem"] {
          font-size: 15px !important;
          margin-left: 0px !important;
          margin-top: 2px !important;
          margin-bottom: 2px !important;
        }
        /* Horizontal Rule */
        .bn-editor-custom hr {
          border: none !important;
          border-top: 1px solid #1a1a1a !important;
          margin: 1.5rem 0 !important;
        }
        /* Blockquote */
        .bn-editor-custom .bn-block-content[data-content-type="blockquote"] {
          border-left: 3px solid #3b82f6 !important;
          padding-left: 16px !important;
          font-style: italic !important;
          color: #94a3b8 !important;
          font-size: 15px !important;
          background: rgba(59, 130, 246, 0.03) !important;
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          margin: 0.75rem 0 !important;
        }
        .bn-editor-custom .bn-inline-content code {
          background: #1e1e1e !important;
          color: #60a5fa !important;
          padding: 3px 7px !important;
          border-radius: 6px !important;
          font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
          font-size: 0.85em !important;
          border: 1px solid #262626 !important;
        }
        /* Indentation & Groups */
        .bn-editor-custom .bn-block-group {
          padding-left: 24px !important;
          margin-left: 8px !important;
        }
        .bn-editor-custom .bn-block-outer {
          padding: 0 !important;
        }
        .bn-editor-custom [data-gradient] {
           display: none !important;
        }
        
        /* Table Styles */
        .bn-editor-custom .bn-table-content-wrapper { border: 1px solid #262626 !important; border-radius: 8px !important; overflow: hidden !important; }
        .bn-editor-custom .bn-table { border-collapse: collapse !important; width: 100% !important; background-color: #0d0d0d !important; }
        .bn-editor-custom .bn-table-cell { border: 1px solid #262626 !important; padding: 8px 12px !important; color: #d4d4d4 !important; }
        .bn-editor-custom .bn-table-cell[data-header] { background-color: #1a1a1a !important; font-weight: 600 !important; color: #fff !important; }
      `}</style>
    </MantineProvider>
  );
}
