"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { Send } from "lucide-react";
import { createComment, createRealityComment, createVisionComment } from "@/app/charts/[id]/actions";
import { searchWorkspaceItems } from "@/lib/workspace-search";
import type { TimelineComment } from "@/types/database";

interface CommentInputProps {
  type: "action" | "vision" | "reality";
  itemId: string;
  chartId: string;
  workspaceId: string;
  currentUserId: string;
  currentUser?: { id?: string; email: string; name?: string; avatar_url?: string | null } | null;
  onOptimisticAdd?: (comment: TimelineComment) => void;
  onPersisted?: () => void;
  onFailed?: (tempId: string) => void;
}

function createMentionSuggestion(workspaceId: string) {
  return {
    char: "@",
    items: async ({ query }: { query: string }) => {
      if (!workspaceId) return [];
      const results = await searchWorkspaceItems(workspaceId, query);
      return results.slice(0, 10).map((r) => ({
        ...r,
        id: `${r.type}:${r.id}`,
        label: r.title,
      }));
    },
    render: () => {
      let component: HTMLDivElement | null = null;
      let selectedIndex = 0;
      let items: { id: string; label: string; type: string; title: string; chartTitle: string }[] = [];
      let command: (item: { id: string; label: string }) => void = () => {};

      function updateDropdown() {
        if (!component) return;
        const typeLabels: Record<string, string> = {
          chart: "📊",
          vision: "🎯",
          reality: "📍",
          tension: "⚡",
          action: "✅",
        };
        component.innerHTML =
          items.length === 0
            ? '<div class="px-3 py-2 text-sm text-gray-400">見つかりません</div>'
            : items
                .map(
                  (item, index) =>
                    `<div class="px-3 py-1.5 text-sm rounded cursor-pointer flex items-center gap-2 ${
                      index === selectedIndex ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
                    }" data-index="${index}">
  <span>${typeLabels[item.type] || ""}</span>
  <span class="truncate">${item.title}</span>
  <span class="text-xs text-gray-400 ml-auto shrink-0">${item.chartTitle}</span>
</div>`
                )
                .join("");

        component.querySelectorAll("[data-index]").forEach((el) => {
          el.addEventListener("click", () => {
            const idx = parseInt(el.getAttribute("data-index") || "0", 10);
            if (items[idx]) command({ id: items[idx].id, label: items[idx].label });
          });
        });
      }

      return {
        onStart: (props: {
          command: (item: { id: string; label: string }) => void;
          items: { id: string; label: string; type: string; title: string; chartTitle: string }[];
          editor: { view: { coordsAtPos: (pos: number) => { left: number; bottom: number } }; state: { doc: { resolve: (pos: number) => unknown } }; schema: { nodes: Record<string, { type: { name: string } }> } };
          range: { from: number };
        }) => {
          command = props.command;
          items = props.items;
          selectedIndex = 0;

          component = document.createElement("div");
          component.className =
            "mention-dropdown bg-white border rounded-lg shadow-lg p-1 max-h-[200px] overflow-y-auto z-[9999]";
          updateDropdown();

          const { view } = props.editor;
          const coords = view.coordsAtPos(props.range.from);
          component.style.position = "fixed";
          component.style.left = `${coords.left}px`;
          component.style.top = `${coords.bottom + 4}px`;
          document.body.appendChild(component);
        },
        onUpdate: (props: {
          command: (item: { id: string; label: string }) => void;
          items: { id: string; label: string; type: string; title: string; chartTitle: string }[];
        }) => {
          items = props.items;
          command = props.command;
          selectedIndex = 0;
          updateDropdown();
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "ArrowUp") {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateDropdown();
            return true;
          }
          if (props.event.key === "ArrowDown") {
            selectedIndex = (selectedIndex + 1) % items.length;
            updateDropdown();
            return true;
          }
          if (props.event.key === "Enter") {
            if (items[selectedIndex]) {
              command({ id: items[selectedIndex].id, label: items[selectedIndex].label });
            }
            return true;
          }
          return false;
        },
        onExit: () => {
          component?.remove();
          component = null;
        },
      };
    },
  };
}

export function CommentInput({
  type,
  itemId,
  chartId,
  workspaceId,
  currentUserId,
  currentUser,
  onOptimisticAdd,
  onPersisted,
  onFailed,
}: CommentInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmitRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(workspaceId),
    [workspaceId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder:
          "コメントを入力... (Cmd+Enterで送信、Markdownも使えます、@でメンション)",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: mentionSuggestion as any,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[60px] max-h-[200px] overflow-y-auto p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500",
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          handleSubmitRef.current();
          return true;
        }
        return false;
      },
    },
  }, [workspaceId, mentionSuggestion]);

  const handleSubmit = async () => {
    if (!editor?.getHTML || editor.isEmpty || isSubmitting) return;
    const htmlContent = editor.getHTML().trim();
    if (!htmlContent || htmlContent === "<p></p>") return;

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticComment: TimelineComment = {
      id: tempId,
      user_id: currentUserId,
      content: htmlContent,
      created_at: now,
      updated_at: now,
      profile: {
        id: currentUserId,
        email: currentUser?.email || "",
        name: currentUser?.name || null,
        avatar_url: currentUser?.avatar_url || null,
      },
      ...(type === "action" && { action_id: itemId }),
      ...(type === "vision" && { vision_id: itemId }),
      ...(type === "reality" && { reality_id: itemId }),
    };

    onOptimisticAdd?.(optimisticComment);
    editor.commands.clearContent();
    setIsSubmitting(true);

    let result;
    switch (type) {
      case "vision":
        result = await createVisionComment(itemId, htmlContent, chartId);
        break;
      case "reality":
        result = await createRealityComment(itemId, htmlContent, chartId);
        break;
      case "action":
      default:
        result = await createComment(itemId, htmlContent, chartId);
    }

    setIsSubmitting(false);
    if (result.success) {
      onPersisted?.();
      editor.commands.focus();
    } else {
      onFailed?.(tempId);
      editor.commands.setContent(htmlContent);
      alert("コメントの投稿に失敗しました");
    }
    setTimeout(() => editor.commands.focus(), 0);
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const isEmpty = editor?.isEmpty ?? true;

  return (
    <div className="flex gap-2">
      <div className="flex-1 border border-zenshin-navy/15 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 disabled:opacity-50">
        <EditorContent editor={editor} />
      </div>
      <button
        onClick={() => void handleSubmit()}
        disabled={isEmpty || isSubmitting}
        className="shrink-0 px-4 bg-zenshin-teal text-white rounded-lg hover:bg-zenshin-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        title="送信 (Cmd+Enter)"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
