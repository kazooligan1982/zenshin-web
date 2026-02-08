"use client"

import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { createComment, createRealityComment, createVisionComment } from "@/app/charts/[id]/actions"
import type { TimelineComment } from "@/types/database"

interface CommentInputProps {
  type: "action" | "vision" | "reality"
  itemId: string
  chartId: string
  currentUserId: string
  currentUser?: { id?: string; email: string; name?: string; avatar_url?: string | null } | null
  onOptimisticAdd?: (comment: TimelineComment) => void
  onPersisted?: () => void
  onFailed?: (tempId: string) => void
}

export function CommentInput({
  type,
  itemId,
  chartId,
  currentUserId,
  currentUser,
  onOptimisticAdd,
  onPersisted,
  onFailed,
}: CommentInputProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [content])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return
    const trimmed = content.trim()
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    const optimisticComment: TimelineComment = {
      id: tempId,
      user_id: currentUserId,
      content: trimmed,
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
    }

    console.log(
      "[CommentInput] currentUser:",
      currentUser,
      "currentUserId:",
      currentUserId,
      "profile:",
      optimisticComment.profile
    )
    onOptimisticAdd?.(optimisticComment)
    setContent("")
    setIsSubmitting(true)
    let result
    switch (type) {
      case "vision":
        result = await createVisionComment(itemId, trimmed, chartId)
        break
      case "reality":
        result = await createRealityComment(itemId, trimmed, chartId)
        break
      case "action":
      default:
        result = await createComment(itemId, trimmed, chartId)
    }
    setIsSubmitting(false)
    if (result.success) {
      onPersisted?.()
      textareaRef.current?.focus()
    } else {
      onFailed?.(tempId)
      setContent(trimmed)
      alert("コメントの投稿に失敗しました")
    }
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          adjustTextareaHeight()
        }}
        onKeyDown={handleKeyDown}
        placeholder="コメントを入力... (Cmd+Enterで送信)"
        className="flex-1 p-2 border rounded-lg text-sm resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] max-h-[200px]"
        rows={2}
        disabled={isSubmitting}
      />
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        className="shrink-0 px-4 bg-zenshin-teal text-white rounded-lg hover:bg-zenshin-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        title="送信 (Cmd+Enter)"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
