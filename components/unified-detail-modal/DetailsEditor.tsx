"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface DetailsEditorProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

export function DetailsEditor({
  value,
  onSave,
  placeholder,
}: DetailsEditorProps) {
  const t = useTranslations("modal");
  const placeholderText = placeholder ?? t("detailsPlaceholder");

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: false }),
        Placeholder.configure({ placeholder: placeholderText }),
      ],
      content: value || "<p></p>",
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3 text-sm",
        },
      },
      onBlur: ({ editor }) => {
        const html = editor.getHTML();
        const trimmed = html === "<p></p>" ? "" : html;
        if (trimmed !== value) {
          onSave(trimmed);
        }
      },
      immediatelyRender: false,
    },
    []
  );

  useEffect(() => {
    if (editor && value !== undefined) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {t("details")}
      </h3>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none w-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:ring-0 [&_.ProseMirror:focus]:outline-none [&_.ProseMirror:focus]:ring-0 [&_.ProseMirror:focus]:shadow-none [&_.ProseMirror:focus]:border-transparent border rounded-lg focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent"
      />
    </div>
  );
}
