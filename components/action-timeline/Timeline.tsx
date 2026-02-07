"use client"

import { useEffect, useRef, useState } from "react"
import { TimelineItem } from "@/components/action-timeline/TimelineItem"
import { CommentInput } from "@/components/action-timeline/CommentInput"
import type { TimelineComment } from "@/types/database"

interface TimelineProps {
  type: "action" | "vision" | "reality"
  itemId: string
  initialComments: TimelineComment[]
  currentUserId: string
  currentUser?: { id?: string; email: string; name?: string; avatar_url?: string | null } | null
  chartId: string
  onCommentAdded?: () => void
  onCommentDeleted?: () => void
}

const INITIAL_VISIBLE_COUNT = 5

export function Timeline({
  type,
  itemId,
  initialComments,
  currentUserId,
  currentUser,
  chartId,
  onCommentAdded,
  onCommentDeleted,
}: TimelineProps) {
  const [comments, setComments] = useState(initialComments)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCommentsLengthRef = useRef(initialComments.length)

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevCommentsLengthRef.current = comments.length
  }, [comments.length])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const visibleComments = isExpanded ? comments : comments.slice(-INITIAL_VISIBLE_COUNT)
  const hiddenCount = comments.length - INITIAL_VISIBLE_COUNT
  const hasMoreComments = hiddenCount > 0

  const handleDelete = (commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId))
  }

  const handleRestore = (comment: TimelineComment) => {
    setComments((prev) => {
      const exists = prev.some((item) => item.id === comment.id)
      if (exists) return prev
      return [...prev, comment].sort((a, b) => a.created_at.localeCompare(b.created_at))
    })
  }

  const handleUpdate = (commentId: string, newContent: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, content: newContent } : comment
      )
    )
  }

  const handleOptimisticAdd = (newComment: TimelineComment) => {
    setComments((prev) => [...prev, newComment])
  }

  const handleAddFailed = (tempId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== tempId))
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg bg-white shadow-sm">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zenshin-cream/30">
        {hasMoreComments && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 text-xs text-zenshin-navy/50 hover:text-zenshin-navy hover:bg-zenshin-cream/50 rounded-lg transition-colors"
          >
            以前のコメントを表示 ({hiddenCount}件)
          </button>
        )}
        {visibleComments.map((comment) => (
          <TimelineItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            chartId={chartId}
            type={type}
            onDelete={handleDelete}
            onDeleted={onCommentDeleted}
            onRestore={handleRestore}
            onUpdated={handleUpdate}
          />
        ))}
        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-zenshin-navy/40 text-sm mb-2">まだコメントがありません</p>
            <p className="text-zenshin-navy/30 text-xs">最初のコメントを投稿してみましょう</p>
          </div>
        )}
      </div>
      <div className="shrink-0 p-4 border-t bg-white">
        <CommentInput
          type={type}
          itemId={itemId}
          chartId={chartId}
          currentUserId={currentUserId}
          currentUser={currentUser}
          onOptimisticAdd={handleOptimisticAdd}
          onFailed={handleAddFailed}
          onPersisted={onCommentAdded}
        />
      </div>
    </div>
  )
}
